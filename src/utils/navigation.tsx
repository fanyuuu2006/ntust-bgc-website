/** 判斷目前路徑是否對應到某個導覽項目（根路徑需完全比對，避免例如 /admin 誤判所有子路由）*/
export function isAdminActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
