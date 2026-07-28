export function formatDate(
  ...dateable: ConstructorParameters<typeof Date>
): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(...dateable));
}
