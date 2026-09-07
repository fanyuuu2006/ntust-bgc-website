import "server-only";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface TransactionalEmailSender {
  send(message: TransactionalEmail): Promise<void>;
}

export class TransactionalEmailDeliveryError extends Error {
  constructor() {
    super("Transactional email delivery failed");
    this.name = "TransactionalEmailDeliveryError";
  }
}
