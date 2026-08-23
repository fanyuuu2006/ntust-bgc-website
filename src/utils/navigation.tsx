type NavigationItem = { href: string };

export function getActiveNavigationHref(
  pathname: string,
  items: readonly NavigationItem[],
): string | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, item) =>
    item.href.length > longest.href.length ? item : longest,
  ).href;
}

export function isAdminActivePath(
  pathname: string,
  href: string,
  items: readonly NavigationItem[],
) {
  return getActiveNavigationHref(pathname, items) === href;
}
