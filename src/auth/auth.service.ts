import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { LoginHistoryService } from './login-history.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  async validateUser(
    identifier: string,
    password: string,
  ): Promise<User | null> {
    let user: User | null;

    // Try to find user by email first
    user = await this.usersService.findByEmail(identifier);

    // If not found by email, try with registration number
    if (!user) {
      user = await this.usersService.findByRegNo(identifier);
    }

    // Return null if user not found
    if (!user) {
      return null;
    }

    // Compare provided password with stored password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateUserWithRequest(
    identifier: string,
    password: string,
    req: Request,
  ): Promise<User | null> {
    let user: User | null;

    // Try to find user by email first
    user = await this.usersService.findByEmail(identifier);

    // If not found by email, try with registration number
    if (!user) {
      user = await this.usersService.findByRegNo(identifier);
    }

    // If not found by email or registration number, try with phone number
    if (!user) {
      user = await this.usersService.findByPhone(identifier);
    }

    // If user not found, log failed login attempt if email provided
    if (!user) {
      // if (identifier.includes('@')) {
      //   await this.loginHistoryService.logFailedLogin(identifier, req);
      // }
      return null;
    }

    // Compare provided password with stored password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // await this.loginHistoryService.logFailedLogin(user.email, req);
      return null;
    }

    // Log successful login
    await this.loginHistoryService.logSuccessfulLogin(
      user.toObject()._id as string,
      user.email,
      req,
    );

    // Update user's lastLogin timestamp
    await this.usersService.updateProfile(user.toObject()._id as string, {
      lastLogin: new Date(),
    });

    return user;
  }

  async login(
    user: User,
  ): Promise<{ token: string; expiresIn: number; permissions: string[] }> {
    // Extract permissions if role exists and has permissions property
    const permissions =
      user.role && user.toObject().role.permissions
        ? user.toObject().role.permissions
        : [];

    // Create JWT payload
    const payload = {
      permissions,
      email: user.email,
      sub: user._id,
      role: user.role ? user.toObject().role.slug : null,
      institute: user.institute,
    };

    // Sign JWT
    return {
      token: this.jwtService.sign(payload),
      expiresIn: 86400, // 24 hours in seconds
      permissions,
    };
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
        if (!['Munawer-PC'].includes(require('os').hostname())) {
          await this.mailService.sendOtp(user.email, otp);
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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    if (user && (await bcrypt.compare(currentPassword, user.password))) {
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      return true;
    }
    return false;
  }
}
