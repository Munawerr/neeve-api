import { Controller, Body, Post, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { LoginDto } from './dto/login.dto';
import { Messages } from './utils/messages';
import {
  ForgotPasswordDto,
  VerifyOtpDto,
  ResendOtpDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.authService.validateUser(email, password);

    if (!user || user.status !== 'active') {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: Messages.notAuthorized,
      };
    }
    return {
      token: await this.authService.login(user),
      profile_info: user,
    };
  }

  @Post('auth/forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const otp =
      process.env.NODE_ENV === 'development'
        ? '0000'
        : Math.floor(1000 + Math.random() * 9000).toString();
    const token = uuidv4();
    await this.authService.sendOtp(email, otp, token);
    return {
      status: HttpStatus.OK,
      message: Messages.otpSent,
      token,
    };
  }

  @Post('auth/verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const { otp, token } = verifyOtpDto;
    const userId = await this.authService.verifyOtp(otp, token);
    if (!userId) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: Messages.invalidOtp,
      };
    }
    return {
      userId,
      status: HttpStatus.OK,
      message: Messages.otpVerified,
    };
  }

  @Post('auth/resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;
    const otp =
      process.env.NODE_ENV === 'development'
        ? '0000'
        : Math.floor(1000 + Math.random() * 9000).toString();
    const token = uuidv4();
    await this.authService.sendOtp(email, otp, token);
    return {
      status: HttpStatus.OK,
      message: Messages.otpResent,
      token,
    };
  }

  @Post('auth/reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { userId, newPassword, token } = resetPasswordDto;
    const isReset = await this.authService.resetPassword(
      userId,
      newPassword,
      token,
    );
    if (!isReset) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: Messages.invalidToken,
      };
    }
    return {
      status: HttpStatus.OK,
      message: Messages.passwordReset,
    };
  }
}
