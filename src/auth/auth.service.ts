import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return this.jwtService.sign(payload);
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

  async verifyOtp(email: string, otp: string, token: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      user.verificationOtp === otp &&
      user.verificationToken === token
    ) {
      user.verificationOtp = '';
      await user.save();
      return true;
    }
    return false;
  }

  async resetPassword(
    email: string,
    newPassword: string,
    token: string,
  ): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.verificationToken === token) {
      user.password = newPassword;
      user.verificationToken = '';
      await user.save();
      return true;
    }
    return false;
  }
}
