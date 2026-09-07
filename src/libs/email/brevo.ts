import "server-only";

import type { EmailConfig } from "@/libs/env";
import {
  TransactionalEmailDeliveryError,
  type TransactionalEmail,
  type TransactionalEmailSender,
} from "./transactional-email";

const BREVO_TRANSACTIONAL_EMAIL_URL =
  "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10_000;

export class BrevoTransactionalEmailSender
  implements TransactionalEmailSender
{
  constructor(
    private readonly config: EmailConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: TransactionalEmail): Promise<void> {
    let response: Response;

    try {
      response = await this.fetchImpl(BREVO_TRANSACTIONAL_EMAIL_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": this.config.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: this.config.from,
            name: this.config.fromName,
          },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new TransactionalEmailDeliveryError();
    }

    if (!response.ok) {
      throw new TransactionalEmailDeliveryError();
    }
  }
}
