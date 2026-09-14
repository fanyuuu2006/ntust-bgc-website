/** 公開身份的完整欄位白名單；不可擴充為完整 User／Profile 或授權依據。 */
export type PublicUserIdentity = Readonly<{
  id: string;
  name: string;
  avatar: string | null;
}>;
