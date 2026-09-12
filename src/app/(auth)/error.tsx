"use client";

import { UnexpectedErrorState } from "@/components/UnexpectedErrorState";

export default function RouteError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
}) {
  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl shrink-0 px-4 py-8">
      <UnexpectedErrorState error={error} reset={retry ?? reset} />
    </section>
  );
}
