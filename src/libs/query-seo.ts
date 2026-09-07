export type QuerySearchParams = Record<
  string,
  string | string[] | undefined
>;

type DefaultQueryAliases = Readonly<Record<string, string>>;

export function classifyQuerySeo(
  searchParams: QuerySearchParams,
  defaultAliases: DefaultQueryAliases,
): { indexable: boolean } {
  const indexable = Object.entries(searchParams).every(
    ([key, value]) =>
      typeof value === "string" && defaultAliases[key] === value,
  );

  return { indexable };
}
