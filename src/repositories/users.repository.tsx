import "server-only";
import { User } from "@/types/database";
import { throwRepositoryError } from "./error";
import { supabase } from "@/libs/supabase/server";

type CreateUserInput = Pick<User, "email" | "name">;
type UpdateUserInput = Partial<Pick<User, "email" | "name" | "avatar">>;

type UserOrderableField = "created_at" | "updated_at" | "name" | "email";

type FindManyUsersOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  email?: string;
  orderBy?: UserOrderableField;
  orderDirection?: "asc" | "desc";
};

type UserListResult = {
  data: User[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const usersRepository = {
  findMany: async (
    options: FindManyUsersOptions = {},
  ): Promise<UserListResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const orderBy = options.orderBy ?? "created_at";
    const orderDirection = options.orderDirection ?? "desc";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("users").select("*", { count: "exact" });

    const keyword = options.search?.trim();
    if (keyword) {
      const conditions = ["name", "email"]
        .map((field) => `${field}.ilike.%${keyword}%`)
        .join(",");
      query = query.or(conditions);
    }

    if (options.email) {
      query = query.eq("email", options.email);
    }

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得用戶列表失敗", error);

    const total = count ?? 0;

    return {
      data: data ?? [],
      count: total,
      page,
      pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
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

  existsByEmail: async (email: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (error) throwRepositoryError("檢查 email 是否存在失敗", error);
    return data !== null;
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
