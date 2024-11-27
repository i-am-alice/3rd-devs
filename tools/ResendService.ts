import { Resend } from 'resend';

interface Attachment {
  filename: string;
  content: Buffer;
}

export class ResendService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendMessage(options: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Attachment[];
  }) {
    const { from, to, subject, text, html, attachments } = options;

    try {
      const result = await this.resend.emails.send({
        from,
        to,
        subject,
        text,
        html,
        attachments,
      });

      console.log(result);

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

