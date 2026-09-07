import {
  getPreservedQueryEntries,
  type AppliedQuery,
} from "@/libs/query-navigation";

type PreservedQueryFieldsProps = {
  query: AppliedQuery;
  ownedKeys: readonly string[];
};

export function PreservedQueryFields({
  query,
  ownedKeys,
}: PreservedQueryFieldsProps) {
  return (
    <>
      <input type="hidden" name="page" value="1" />
      {getPreservedQueryEntries(query, ownedKeys).map(([name, value], index) => (
        <input
          key={`${name}-${value}-${index}`}
          type="hidden"
          name={name}
          value={value}
        />
      ))}
    </>
  );
}
