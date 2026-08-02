import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { BoardGameLocation } from "@/types/database";

export type CreateBoardGameLocationInput = Pick<BoardGameLocation, "name"> &
  Partial<Pick<BoardGameLocation, "description">>;

export type UpdateBoardGameLocationInput = Partial<
  Pick<BoardGameLocation, "name" | "description">
>;

export const boardGameLocationsRepository = {
  findAll: async (): Promise<BoardGameLocation[]> => {
    const { data, error } = await supabase
      .from("board_game_locations")
      .select("*")
      .order("name", { ascending: true });
    if (error) throwRepositoryError("取得桌遊位置列表失敗", error);
    return data ?? [];
  },

  findById: async (id: string): Promise<BoardGameLocation | null> => {
    const { data, error } = await supabase
      .from("board_game_locations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwRepositoryError("依 ID 尋找桌遊位置失敗", error);
    return data;
  },

  findManyByIds: async (ids: string[]): Promise<BoardGameLocation[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("board_game_locations")
      .select("*")
      .in("id", ids);
    if (error) throwRepositoryError("依 ID 批次尋找桌遊位置失敗", error);
    return data ?? [];
  },

  existsByName: async (name: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from("board_game_locations")
      .select("id", { count: "exact", head: true })
      .eq("name", name);
    if (excludeId) query = query.neq("id", excludeId);

    const { count, error } = await query;
    if (error) throwRepositoryError("檢查位置名稱是否存在失敗", error);
    return (count ?? 0) > 0;
  },

  create: async (
    payload: CreateBoardGameLocationInput,
  ): Promise<BoardGameLocation> => {
    const { data, error } = await supabase
      .from("board_game_locations")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立桌遊位置失敗", error);
    return data;
  },

  updateById: async (
    id: string,
    payload: UpdateBoardGameLocationInput,
  ): Promise<BoardGameLocation | null> => {
    if (Object.keys(payload).length === 0) {
      return boardGameLocationsRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("board_game_locations")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新桌遊位置失敗", error);
    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("board_game_locations")
      .delete()
      .eq("id", id);
    if (error) throwRepositoryError("刪除桌遊位置失敗", error);
  },
};
