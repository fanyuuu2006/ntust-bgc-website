import "server-only";

import { REGISTER_KEY_SECRET } from "@/libs/env";
import { academicYearsRepository } from "@/repositories/academic-years.repository";
import {
  membershipRegisterKeysRepository,
  type FindManyRegisterKeysOptions,
} from "@/repositories/membership-register-keys.repository";
import {
  membershipsRepository,
  type FindManyAdminMembershipsOptions,
  type FindManyMembershipsOptions,
} from "@/repositories/memberships.repository";
import { buildPaginationResult } from "@/repositories/shared/pagination";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import { usersRepository } from "@/repositories/users.repository";
import type { Membership } from "@/types/database";
import {
  activateMembershipSchema,
  generateMembershipRegisterKeysSchema,
  createAdminMembershipSchema,
  updateAdminMembershipSchema,
  listAdminMembershipsQuerySchema,
  listMembershipRegisterKeysQuerySchema,
} from "./memberships.schema";
import {
  AcademicYearNotFoundError,
  MembershipRegisterKeyInactiveError,
  MembershipRegisterKeyNotCurrentYearError,
  MembershipRegisterKeyNotFoundError,
  MembershipRegisterKeyCannotBeRevokedError,
  MembershipAlreadyExistsForAcademicYearError,
  RegisterKeySecretNotConfiguredError,
  UserAlreadyCurrentMemberError,
  UserAlreadyLifetimeMemberError,
} from "./memberships.errors";
import type {
  AdminMembership,
  MembershipRegisterKeyWithAcademicYear,
  MembershipWithAcademicYear,
  UserMembershipEligibility,
} from "./memberships.types";
import { isCurrentActiveMembership } from "./memberships.types";

async function attachAcademicYears(
  memberships: Membership[],
): Promise<MembershipWithAcademicYear[]> {
  const academicYearIds = [
    ...new Set(memberships.map((membership) => membership.academic_year_id)),
  ];
  const academicYears =
    await academicYearsRepository.findManyByIds(academicYearIds);
  const academicYearsById = new Map(
    academicYears.map((year) => [year.id, year]),
  );

  return memberships.map((membership) => ({
    ...membership,
    academic_year: academicYearsById.get(membership.academic_year_id) ?? null,
  }));
}

async function attachAdminMembershipDetails(
  memberships: Membership[],
): Promise<AdminMembership[]> {
  const userIds = memberships
    .map((membership) => membership.user_id)
    .filter((userId): userId is string => Boolean(userId));
  const academicYearIds = [
    ...new Set(memberships.map((membership) => membership.academic_year_id)),
  ];
  const [users, profiles, academicYears] = await Promise.all([
    usersRepository.findManyByIds(userIds),
    userProfilesRepository.findManyByUserIds(userIds),
    academicYearsRepository.findManyByIds(academicYearIds),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const profilesByUserId = new Map(
    profiles.map((profile) => [profile.user_id, profile]),
  );
  const academicYearsById = new Map(
    academicYears.map((year) => [year.id, year]),
  );

  return memberships.flatMap((membership) => {
    const user = membership.user_id
      ? usersById.get(membership.user_id)
      : undefined;
    if (!user) return [];
    return [{
      ...membership,
      user,
      user_profile: profilesByUserId.get(user.id) ?? null,
      academic_year: academicYearsById.get(membership.academic_year_id) ?? null,
    }];
  });
}

async function findMatchedUserIds(search?: string): Promise<string[] | undefined> {
  if (!search) return undefined;
  return [
    ...new Set(
      (
        await Promise.all([
          usersRepository.findIdsBySearch(search),
          userProfilesRepository.findUserIdsBySearch(search),
        ])
      ).flat(),
    ),
  ];
}

export const membershipService = {
  createForAdmin: async (input: unknown) => {
    const data = createAdminMembershipSchema.parse(input);
    const [user, year, existing, existingLifetime] = await Promise.all([
      usersRepository.findById(data.user_id),
      academicYearsRepository.findById(data.academic_year_id),
      membershipsRepository.findByUserIdAndAcademicYearId(data.user_id, data.academic_year_id),
      data.type === "lifetime"
        ? membershipsRepository.findActiveLifetimeByUserId(data.user_id)
        : Promise.resolve(null),
    ]);
    if (!user) throw new Error("找不到此使用者");
    if (!year) throw new AcademicYearNotFoundError();
    if (existingLifetime) throw new UserAlreadyLifetimeMemberError();
    if (existing) throw new MembershipAlreadyExistsForAcademicYearError();
    return membershipsRepository.create({ ...data, joined_at: data.joined_at ?? (data.status === "active" ? new Date().toISOString() : null), membership_register_key_id: null });
  },

  updateForAdmin: async (id: string, input: unknown) => {
    const current = await membershipsRepository.findById(id);
    if (!current) throw new Error("找不到此社員資格");
    const data = updateAdminMembershipSchema.parse(input);
    if (!canTransitionMembershipStatus(current.status, data.status)) throw new Error(`不允許從 ${current.status} 變更為 ${data.status}`);
    if (data.type === "annual" && current.user_id) {
      const existingAnnual = await membershipsRepository.findAnnualByUserIdAndAcademicYearId(
        current.user_id,
        data.academic_year_id,
        id,
      );
      if (existingAnnual) throw new MembershipAlreadyExistsForAcademicYearError();
    }
    if (data.type === "lifetime" && current.user_id) {
      const existingLifetime = await membershipsRepository.findActiveLifetimeByUserId(
        current.user_id,
        id,
      );
      if (existingLifetime) throw new UserAlreadyLifetimeMemberError();
    }
    const updated = await membershipsRepository.updateById(id, {
      academic_year_id: data.academic_year_id,
      type: data.type,
      status: data.status,
      joined_at: data.joined_at ?? current.joined_at,
    });
    if (!updated) throw new Error("更新社員資格失敗");
    return updated;
  },
  listAcademicYears: async () => {
    return academicYearsRepository.findMany();
  },

  getCurrentMembershipByUserId: async (
    userId: string,
  ): Promise<MembershipWithAcademicYear | null> => {
    const [currentYear, activeMemberships] = await Promise.all([
      academicYearsRepository.findCurrent(),
      membershipsRepository.findManyActiveByUserIds([userId]),
    ]);
    const membership =
      activeMemberships.find(
        (item) =>
          item.type === "lifetime" &&
          isCurrentActiveMembership(item, currentYear?.id),
      ) ??
      activeMemberships.find((item) =>
        isCurrentActiveMembership(item, currentYear?.id),
      );

    if (!membership) return null;

    const academicYear =
      membership.academic_year_id === currentYear?.id
        ? currentYear
        : await academicYearsRepository.findById(membership.academic_year_id);

    return { ...membership, academic_year: academicYear };
  },

  getMembershipsByUserId: async (
    userId: string,
    options: FindManyMembershipsOptions = {},
  ): Promise<
    ReturnType<typeof buildPaginationResult<MembershipWithAcademicYear>>
  > => {
    const result = await membershipsRepository.findManyByUserId(userId, {
      orderBy: "joined_at",
      orderDirection: "desc",
      ...options,
    });
    const data = await attachAcademicYears(result.data);

    return { ...result, data };
  },

  listAdminMemberships: async (
    input: unknown,
  ): Promise<ReturnType<typeof buildPaginationResult<AdminMembership>>> => {
    const query = listAdminMembershipsQuerySchema.parse(input);
    const matchedUserIds = await findMatchedUserIds(query.search);

    const options: FindManyAdminMembershipsOptions = {
      page: query.page,
      pageSize: query.pageSize,
      academicYearId: query.academic_year_id,
      userIds: matchedUserIds,
      status: query.status,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
    };
    const result = await membershipsRepository.findManyForAdmin(options);
    const data = await attachAdminMembershipDetails(result.data);

    return { ...result, data };
  },

  getUserMembershipEligibility: async (
    userIds: string[],
  ): Promise<Record<string, UserMembershipEligibility>> => {
    const [currentYear, activeMemberships] = await Promise.all([
      academicYearsRepository.findCurrent(),
      membershipsRepository.findManyActiveByUserIds(userIds),
    ]);
    const eligibilityByUserId: Record<string, UserMembershipEligibility> = {};

    for (const userId of userIds) {
      eligibilityByUserId[userId] = {
        hasActiveLifetimeMembership: false,
        hasCurrentAnnualMembership: false,
      };
    }

    for (const membership of activeMemberships) {
      if (!membership.user_id || !eligibilityByUserId[membership.user_id]) {
        continue;
      }

      if (membership.type === "lifetime") {
        eligibilityByUserId[membership.user_id].hasActiveLifetimeMembership =
          true;
      } else if (isCurrentActiveMembership(membership, currentYear?.id)) {
        eligibilityByUserId[membership.user_id].hasCurrentAnnualMembership =
          true;
      }
    }

    return eligibilityByUserId;
  },

  deleteForAdmin: async (id: string) => {
    const membership = await membershipsRepository.findById(id);
    if (!membership) throw new Error("找不到此社員資格");
    await membershipsRepository.deleteById(id);
  },

  listRegisterKeys: async (
    input: unknown,
  ): Promise<
    ReturnType<
      typeof buildPaginationResult<MembershipRegisterKeyWithAcademicYear>
    >
  > => {
    const query = listMembershipRegisterKeysQuerySchema.parse(input);
    const options: FindManyRegisterKeysOptions = {
      page: query.page,
      pageSize: query.pageSize,
      academicYearId: query.academic_year_id,
      search: query.search,
      status: query.status,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
    };
    const result = await membershipRegisterKeysRepository.findMany(options);
    const academicYearIds = [
      ...new Set(result.data.map((registerKey) => registerKey.academic_year_id)),
    ];
    const createdByUserIds = [
      ...new Set(
        result.data
          .map((registerKey) => registerKey.created_by_user_id)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];
    const claimedRegisterKeyIds = result.data.map(
      (registerKey) => registerKey.id,
    );

    const [academicYears, createdByUsers, claimedMemberships] =
      await Promise.all([
        academicYearsRepository.findManyByIds(academicYearIds),
        usersRepository.findManyByIds(createdByUserIds),
        membershipsRepository.findManyByRegisterKeyIds(claimedRegisterKeyIds),
      ]);
    const academicYearsById = new Map(
      academicYears.map((year) => [year.id, year]),
    );
    const createdByUsersById = new Map(
      createdByUsers.map((user) => [user.id, user]),
    );
    const claimedMembershipsByRegisterKeyId = new Map(
      (await attachAcademicYears(
        claimedMemberships.filter((membership) =>
          membership.membership_register_key_id
            ? claimedRegisterKeyIds.includes(membership.membership_register_key_id)
            : false,
        ),
      )).map((membership) => [
        membership.membership_register_key_id,
        membership,
      ]),
    );

    const data = result.data.map((registerKey) => ({
      ...registerKey,
      academic_year:
        academicYearsById.get(registerKey.academic_year_id) ?? null,
      created_by_user: registerKey.created_by_user_id
        ? createdByUsersById.get(registerKey.created_by_user_id) ?? null
        : null,
      claimed_membership:
        claimedMembershipsByRegisterKeyId.get(registerKey.id) ?? null,
    }));

    return { ...result, data };
  },

  generateRegisterKeys: async (
    adminUserId: string,
    input: unknown,
  ): Promise<MembershipRegisterKeyWithAcademicYear[]> => {
    const payload = generateMembershipRegisterKeysSchema.parse(input);
    const academicYear = await academicYearsRepository.findById(
      payload.academic_year_id,
    );

    if (!academicYear) {
      throw new AcademicYearNotFoundError();
    }

    if (!REGISTER_KEY_SECRET || REGISTER_KEY_SECRET.trim().length < 16) {
      throw new RegisterKeySecretNotConfiguredError();
    }

    const registerKeys = await membershipRegisterKeysRepository.generateMany({
      academicYearId: academicYear.id,
      count: payload.count,
      secret: REGISTER_KEY_SECRET.trim(),
      createdByUserId: adminUserId,
    });
    const createdByUser = await usersRepository.findById(adminUserId);

    return registerKeys.map((registerKey) => ({
      ...registerKey,
      academic_year: academicYear,
      created_by_user: createdByUser,
      claimed_membership: null,
    }));
  },

  revokeRegisterKey: async (id: string) => {
    const revoked = await membershipRegisterKeysRepository.revokeAvailableById(id);
    if (!revoked) throw new MembershipRegisterKeyCannotBeRevokedError();
    return revoked;
  },

  activateByRegisterKey: async (
    userId: string,
    input: unknown,
  ): Promise<MembershipWithAcademicYear> => {
    const payload = activateMembershipSchema.parse(input);
    const claimResult = await membershipRegisterKeysRepository.claimByRegisterKey(
      payload.register_key,
      userId,
    );

    switch (claimResult.result) {
      case "claimed": {
        const academicYear = await academicYearsRepository.findById(
          claimResult.membership.academic_year_id,
        );

        return {
          ...claimResult.membership,
          academic_year: academicYear,
        };
      }
      case "not_found":
        throw new MembershipRegisterKeyNotFoundError();
      case "not_current_year":
        throw new MembershipRegisterKeyNotCurrentYearError();
      case "unavailable":
        throw new MembershipRegisterKeyInactiveError();
      case "already_lifetime_member":
        throw new UserAlreadyLifetimeMemberError();
      case "already_current_member":
        throw new UserAlreadyCurrentMemberError();
    }
  },

  isCurrentActiveMember: async (userId: string): Promise<boolean> =>
    (await membershipService.getCurrentMembershipByUserId(userId)) !== null,

  getJoinedYear: async (userId: string): Promise<string | null> => {
    const memberships = await membershipsRepository.findManyByUserId(userId, {
      orderDirection: "asc",
      pageSize: 1,
    });

    if (memberships.data.length === 0) {
      return null;
    }

    const joinedMembership = memberships.data[0];
    const academicYear = await academicYearsRepository.findById(
      joinedMembership.academic_year_id,
    );

    return academicYear?.year ?? null;
  },
};

function canTransitionMembershipStatus(from: Membership["status"], to: Membership["status"]) {
  if (from === to) return true;
  const transitions: Record<Membership["status"], Membership["status"][]> = {
    pending: ["active", "cancelled"], active: ["suspended", "cancelled", "expired"], suspended: ["active", "cancelled"], expired: [], cancelled: [],
  };
  return transitions[from].includes(to);
}
