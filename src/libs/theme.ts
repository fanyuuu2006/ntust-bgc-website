export const THEME_STORAGE_KEY = "ntust-bgc-theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference);
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

// 這段程式必須在首次繪製前執行，避免已選深色模式的使用者先看到淺色畫面。
export const THEME_INITIALIZATION_SCRIPT = `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const valid = new Set(["system", "light", "dark"]);
  let preference = "system";
  try {
    const stored = localStorage.getItem(key);
    if (valid.has(stored)) preference = stored;
  } catch {}
  let systemPrefersDark = false;
  try {
    systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
  } catch {}
  const resolved = preference === "system" ? (systemPrefersDark ? "dark" : "light") : preference;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
})();`;
