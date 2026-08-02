import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { BoardGameCategory } from "@/types/database";

export type CreateBoardGameCategoryInput = Pick<BoardGameCategory, "name"> &
  Partial<Pick<BoardGameCategory, "description">>;

export type UpdateBoardGameCategoryInput = Partial<
  Pick<BoardGameCategory, "name" | "description">
>;

export const boardGameCategoriesRepository = {
  /**
   * 分類數量通常不多,不做分頁,直接依名稱排序回傳全部。
   */
  findAll: async (): Promise<BoardGameCategory[]> => {
    const { data, error } = await supabase
      .from("board_game_categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throwRepositoryError("取得桌遊分類列表失敗", error);
    return data ?? [];
  },

  findById: async (id: string): Promise<BoardGameCategory | null> => {
    const { data, error } = await supabase
      .from("board_game_categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwRepositoryError("依 ID 尋找桌遊分類失敗", error);
    return data;
  },

  findManyByIds: async (ids: string[]): Promise<BoardGameCategory[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("board_game_categories")
      .select("*")
      .in("id", ids);
    if (error) throwRepositoryError("依 ID 批次尋找桌遊分類失敗", error);
    return data ?? [];
  },

  existsByName: async (name: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from("board_game_categories")
      .select("id", { count: "exact", head: true })
      .eq("name", name);
    if (excludeId) query = query.neq("id", excludeId);

    const { count, error } = await query;
    if (error) throwRepositoryError("檢查分類名稱是否存在失敗", error);
    return (count ?? 0) > 0;
  },

  create: async (
    payload: CreateBoardGameCategoryInput,
  ): Promise<BoardGameCategory> => {
    const { data, error } = await supabase
      .from("board_game_categories")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立桌遊分類失敗", error);
    return data;
  },

  updateById: async (
    id: string,
    payload: UpdateBoardGameCategoryInput,
  ): Promise<BoardGameCategory | null> => {
    if (Object.keys(payload).length === 0) {
      return boardGameCategoriesRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("board_game_categories")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新桌遊分類失敗", error);
    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("board_game_categories")
      .delete()
      .eq("id", id);
    if (error) throwRepositoryError("刪除桌遊分類失敗", error);
  },
};
