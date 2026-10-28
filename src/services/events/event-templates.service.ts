import { z } from "zod";
import { eventTemplatesRepository } from "@/repositories/event-templates.repository";
import { descriptionFields, validateDescription, canonicalizeDescription } from "@/libs/rich-content/description";
import { CALENDAR_COLOR_PATTERN } from "@/utils/calendar-color";

const templateShape = z.object({
  name: z.string().trim().min(1).max(100),
  ...descriptionFields,
  calendar_color: z.string().regex(CALENDAR_COLOR_PATTERN).nullable().optional(),
});
const templateSchema = templateShape.superRefine(validateDescription).transform(canonicalizeDescription);

export const eventTemplatesService = {
  list: () => eventTemplatesRepository.findMany(),
  get: (id: string) => eventTemplatesRepository.findById(id),
  create: async (input: unknown) => {
    const data = await templateSchema.parseAsync(input);
    return eventTemplatesRepository.create({ description: null, description_format: "plain_text", rich_description: null, calendar_color: null, ...data });
  },
  update: async (id: string, input: unknown) => eventTemplatesRepository.updateById(id, await templateShape.partial().superRefine(validateDescription).parseAsync(input)),
  delete: (id: string) => eventTemplatesRepository.deleteById(id),
};
