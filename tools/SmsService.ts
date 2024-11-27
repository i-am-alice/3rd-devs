import { SMSAPI } from 'smsapi';

export class SmsService {
  private smsapi: SMSAPI;

  constructor(oAuthToken: string) {
    this.smsapi = new SMSAPI(oAuthToken);
  }

  async sendSms(phoneNumber: string, message: string): Promise<any> {
    try {
      const result = await this.smsapi.sms.sendSms(phoneNumber, message);
      console.log('SMS sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }
}

