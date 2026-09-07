import "server-only";

import { getEmailConfig } from "@/libs/env";
import { BrevoTransactionalEmailSender } from "./brevo";
import type { TransactionalEmailSender } from "./transactional-email";

export function getTransactionalEmailSender(): TransactionalEmailSender {
  return new BrevoTransactionalEmailSender(getEmailConfig());
}
