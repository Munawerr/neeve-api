import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User } from '../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
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

  async sendOtp(email: string, otp: string, token: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      user.verificationOtp = otp;
      user.verificationToken = token;
      await user.save();
      await this.mailService.sendOtp(email, otp);
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
      user.password = await bcrypt.hash(newPassword, 10);
      user.verificationToken = '';
      await user.save();
      return true;
    }
    return false;
  }
}
