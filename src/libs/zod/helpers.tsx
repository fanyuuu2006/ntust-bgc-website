import { z } from "zod";

export const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === "") {
      return undefined;
    }

    return value;
  }, schema.optional());
