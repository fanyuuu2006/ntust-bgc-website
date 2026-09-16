export function wasReviewMeaningfullyEdited(createdAt: string, updatedAt: string) {
  const difference = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return Number.isFinite(difference) && difference >= 1_000;
}
