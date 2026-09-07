"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/Select";
import {
  buildOwnedQueryHref,
  type AppliedQuery,
} from "@/libs/query-navigation";

type ImmediateQuerySelectProps = Omit<
  React.ComponentProps<typeof Select>,
  "defaultValue" | "name" | "onChange" | "value"
> & {
  appliedQuery: AppliedQuery;
  basePath: string;
  queryKey: string;
  value: string;
};

export function ImmediateQuerySelect({
  appliedQuery,
  basePath,
  queryKey,
  value,
  ...props
}: ImmediateQuerySelectProps) {
  const router = useRouter();

  return (
    <Select
      {...props}
      value={value}
      onChange={(event) => {
        router.push(
          buildOwnedQueryHref({
            basePath,
            appliedQuery,
            ownedKeys: [queryKey],
            changes: { [queryKey]: event.target.value },
          }),
        );
      }}
    />
  );
}
