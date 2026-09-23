import "server-only";

import { supportRepository } from "@/repositories/support.repository";
import { formatTaipeiDateTimeLocal, parseTaipeiDateTimeLocal } from "@/utils/date";
import { z } from "zod";
import { createSupportRecordSchema, updateSupportRecordSchema } from "./support.schema";
import { SupportRecordStateError } from "./support.errors";
import type { PublicSupporter } from "./support.types";

export const supportService = {
  listPrivate: () => supportRepository.listPrivate(),

  createVerified: async (raw: unknown) => {
    const input = createSupportRecordSchema.parse(raw);
    const paidAt = parseTaipeiDateTimeLocal(input.paidAt);
    if (!paidAt || formatTaipeiDateTimeLocal(new Date(paidAt)) !== input.paidAt || new Date(paidAt) > new Date()) {
      throw new z.ZodError([{ code: "custom", path: ["paidAt"], message: "請輸入有效且已發生的付款時間" }]);
    }
    return supportRepository.createVerified({
      provider: input.provider,
      reference: input.providerTransactionReference,
      paidAt,
    });
  },

  update: async (id: string, raw: unknown) => {
    const recordId = z.uuid().parse(id);
    const input = updateSupportRecordSchema.parse(raw);
    let record;
    switch (input.action) {
      case "recordConsent":
        record = await supportRepository.updateConsent(recordId, {
          name: input.displayName,
          method: input.consentMethod,
          at: new Date().toISOString(),
        });
        break;
      case "publish":
        record = await supportRepository.publish(recordId, new Date().toISOString());
        break;
      case "withdraw":
        record = await supportRepository.withdraw(recordId, new Date().toISOString());
        break;
      case "refund":
        record = await supportRepository.markRefunded(recordId);
        break;
    }
    if (!record) throw new SupportRecordStateError();
    return record;
  },

  listPublicSupporters: async (): Promise<PublicSupporter[]> => {
    const records = await supportRepository.listPublicSupporters();
    return records.map((record) => ({ displayName: record.public_display_name }));
  },
};
