/** 公開身份的完整欄位白名單；不可擴充為完整 User／Profile 或授權依據。 */
export type PublicUserIdentity = Readonly<{
  id: string;
  name: string;
  avatar: string | null;
}>;

/** 公開身份標籤只保留文字與呈現分類，不包含關聯 ID 或管理時間戳。 */
export type PublicIdentityBadge = Readonly<{ label: string; category: "current-membership" | "historical-membership" | "officer" }>;
export type PublicProfile = Readonly<{
  identity: PublicUserIdentity;
  identityBadges: PublicIdentityBadge[];
  /** 註銷者不提供統計，不能以 0 偽裝其歷史資料。 */
  clubFootprint: { totalBorrowedCount: number; attendedCount: number; joinedAcademicYear: string | null } | null;
}>;
