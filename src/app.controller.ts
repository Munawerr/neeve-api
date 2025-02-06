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
import { User } from './users/schemas/user.schema'; // Import UserStatus
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Hello message' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hello message retrieved successfully' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto): Promise<{
    status?: number;
    message?: string;
    token?: string;
    profile_info?: User;
  }> {
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
      status: HttpStatus.OK,
      message: 'Login' + Messages.successful,
    };
  }

  @Post('auth/forgot-password')
  @ApiOperation({ summary: 'Forgot password' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent successfully' })
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
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP verified successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid OTP' })
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
  @ApiOperation({ summary: 'Resend OTP' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP resent successfully' })
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
  @ApiOperation({ summary: 'Reset password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Password reset successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid token' })
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
