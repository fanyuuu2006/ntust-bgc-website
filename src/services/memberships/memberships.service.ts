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
  listAdminMembershipsQuerySchema,
  listMembershipRegisterKeysQuerySchema,
} from "./memberships.schema";
import {
  AcademicYearNotFoundError,
  MembershipRegisterKeyInactiveError,
  MembershipRegisterKeyNotCurrentYearError,
  MembershipRegisterKeyNotFoundError,
  RegisterKeySecretNotConfiguredError,
  UserAlreadyCurrentMemberError,
  UserAlreadyLifetimeMemberError,
} from "./memberships.errors";
import type {
  AdminMembership,
  MembershipRegisterKeyWithAcademicYear,
  MembershipWithAcademicYear,
} from "./memberships.types";

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

export const membershipService = {
  listAcademicYears: async () => {
    return academicYearsRepository.findMany();
  },

  getCurrentMembershipByUserId: async (
    userId: string,
  ): Promise<MembershipWithAcademicYear | null> => {
    const currentYear = await academicYearsRepository.findCurrent();

    if (!currentYear) {
      return null;
    }

    const membership =
      await membershipsRepository.findByUserIdAndAcademicYearId(
        userId,
        currentYear.id,
      );

    if (!membership) {
      return null;
    }

    return { ...membership, academic_year: currentYear };
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
    const search = query.search;
    const matchedUserIds = search
      ? [
          ...new Set(
            (
              await Promise.all([
                usersRepository.findIdsBySearch(search),
                userProfilesRepository.findUserIdsBySearch(search),
              ])
            ).flat(),
          ),
        ]
      : undefined;

    const options: FindManyAdminMembershipsOptions = {
      page: query.page,
      pageSize: query.pageSize,
      academicYearId: query.academic_year_id,
      userIds: matchedUserIds,
      type: query.type,
      status: query.status,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
    };
    const result = await membershipsRepository.findManyForAdmin(options);
    const userIds = result.data
      .map((membership) => membership.user_id)
      .filter((userId): userId is string => Boolean(userId));
    const academicYearIds = [
      ...new Set(result.data.map((item) => item.academic_year_id)),
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

    const data = result.data.flatMap((membership) => {
      const user = membership.user_id
        ? usersById.get(membership.user_id)
        : undefined;
      if (!user) return [];

      return [
        {
          ...membership,
          user,
          user_profile: profilesByUserId.get(user.id) ?? null,
          academic_year:
            academicYearsById.get(membership.academic_year_id) ?? null,
        },
      ];
    });

    return { ...result, data };
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

  isCurrentActiveMember: async (userId: string): Promise<boolean> => {
    const currentYear = await academicYearsRepository.findCurrent();

    if (!currentYear) {
      return false;
    }

    const membership =
      await membershipsRepository.findByUserIdAndAcademicYearId(
        userId,
        currentYear.id,
      );

    return membership?.status === "active";
  },

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
