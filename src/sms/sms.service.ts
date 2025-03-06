import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SmsService {
  async sendOtp(phone: string, otp: string): Promise<void> {
    const smsApiUrl = 'https://www.fast2sms.com/dev/bulkV2';
    const apiKey = process.env.FAST2SMS_API_KEY;

    await axios.post(
      smsApiUrl,
      {
        route: 'v3',
        sender_id: 'TXTIND',
        message: `Your OTP is ${otp}`,
        language: 'english',
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
