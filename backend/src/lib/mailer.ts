export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Placeholder transport: logs instead of sending.
 * Swap for SendGrid/Resend before launch; keep the same signature.
 */
export async function sendMail(mail: Mail): Promise<void> {
  console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
}
