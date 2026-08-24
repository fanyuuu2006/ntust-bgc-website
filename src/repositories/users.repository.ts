import "server-only";
import { User } from "@/types/database";
import { throwRepositoryError } from "./shared/errors";
import { supabase } from "@/libs/supabase/server";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "./shared/pagination";
import { buildIlikeSearch } from "./shared/search";
import { OrderOptions, PaginationQuery } from "./shared/types";

type CreateUserInput = Pick<User, "email" | "name">;
type UpdateUserInput = Partial<Pick<User, "name" | "avatar">>;

type FindManyUsersOptions = PaginationQuery &
  OrderOptions<"name" | "email" | "created_at" | "updated_at"> & {
    search?: string;
  };

export const usersRepository = {
  findIdsBySearch: async (search: string): Promise<string[]> => {
    const keyword = search.trim();
    if (!keyword) return [];

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .or(buildIlikeSearch(["name", "email"], keyword));

    if (error) throwRepositoryError("依關鍵字取得用戶 ID 失敗", error);
    return (data ?? []).map((user) => user.id);
  },

  findMany: async (options: FindManyUsersOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "created_at";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase.from("users").select("*", { count: "exact" });

    const keyword = options.search?.trim();
    if (keyword) {
      query = query.or(buildIlikeSearch(["name", "email"], keyword));
    }
    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得用戶列表失敗", error);

    return buildPaginationResult<User>(data ?? [], count, page, pageSize);
  },

  findById: async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwRepositoryError("依 ID 尋找用戶失敗", error);
    return data;
  },

  findByEmail: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) throwRepositoryError("依 email 尋找用戶失敗", error);
    return data;
  },

  findManyByIds: async (ids: string[]): Promise<User[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("id", ids);
    if (error) throwRepositoryError("依 ID 批次尋找用戶失敗", error);
    return data ?? [];
  },

  existsByEmail: async (
    email: string,
    excludeId?: string,
  ): Promise<boolean> => {
    let query = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("email", email);
    if (excludeId) query = query.neq("id", excludeId);

    const { count, error } = await query;
    if (error) throwRepositoryError("檢查 email 是否存在失敗", error);
    return (count ?? 0) > 0;
  },

  create: async (payload: CreateUserInput): Promise<User> => {
    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立用戶失敗", error);
    return data;
  },

  createMany: async (payload: CreateUserInput[]): Promise<User[]> => {
    if (payload.length === 0) return [];
    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select();
    if (error) throwRepositoryError("批次建立用戶失敗", error);
    return data ?? [];
  },

  updateById: async (
    id: string,
    payload: UpdateUserInput,
  ): Promise<User | null> => {
    if (Object.keys(payload).length === 0) {
      return usersRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新用戶失敗", error);
    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throwRepositoryError("刪除用戶失敗", error);
  },
};
