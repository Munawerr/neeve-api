import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { User } from '../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { hostname } from 'os';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async validateUserById(userId: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findOne(userId);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(
    user: User,
  ): Promise<{ token: string; expiresIn: number; permissions: string[] }> {
    const permissions = user.toObject().role?.permissions || [];

    const payload = {
      permissions,
      email: user.email,
      sub: user._id,
      role: user.toObject().role?.slug,
    };
    const token = this.jwtService.sign(payload);
    const expiresIn = this.jwtService.decode(token)['exp'];

    return { token, expiresIn, permissions };
  }

  async sendOtp(loginData: string, otp: string, token: string): Promise<void> {
    let user;

    if (loginData.includes('@')) {
      user = await this.usersService.findByEmail(loginData);
    } else if (/^\d+$/.test(loginData)) {
      user = await this.usersService.findByPhone(loginData);
    } else {
      user = await this.usersService.findByRegNo(loginData);
    }

    if (user) {
      user.verificationOtp = otp;
      user.verificationToken = token;
      await user.save();

      if (user.email) {
        if (hostname() !== 'Munawer-PC') {
          // await this.mailService.sendOtp(user.email, otp);
        }
      }

      if (user.phone) {
        await this.smsService.sendOtp(user.phone, otp);
      }
    }
  }

  async verifyOtp(otp: string, token: string): Promise<boolean | unknown> {
    const user = await this.usersService.findByTokenAndOTP(token, otp);
    if (user) {
      user.verificationOtp = '';
      await user.save();
      return user._id;
    }
    return false;
  }

  async resetPassword(
    id: string,
    newPassword: string,
    token: string,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(id);
    if (user && user.verificationToken === token) {
      user.password = await bcrypt.hash(newPassword, 10); // Ensure both arguments are provided
      user.verificationToken = '';
      await user.save();
      return true;
    }
    return false;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (user && await bcrypt.compare(currentPassword, user.password)) {
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      return true;
    }
    return false;
  }
}
