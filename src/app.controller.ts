import {
  Controller,
  Body,
  Post,
  Get,
  HttpStatus,
  Param,
  UseGuards,
  Headers,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import {
  ForgotPasswordDto,
  VerifyOtpDto,
  ResendOtpDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CoursesService } from './courses/courses.service';
import { Course } from './courses/schemas/course.schema';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsersService } from './users/users.service';
import * as jwt from 'jsonwebtoken';
import { S3Service } from './s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Hello message' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hello message retrieved successfully',
  })
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
    expiresIn?: number;
    permissions?: string[];
    profile_info?: Object;
    role?: any;
    courses?: Course[];
  }> {
    const { email, password } = loginDto;
    const user = await this.authService.validateUser(email, password);

    if (!user || user.status !== 'active') {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: Messages.notAuthorized,
      };
    }

    const courseIds = user.packages.map((pkg) => pkg.course.toString());
    const distinctCourseIds = [...new Set(courseIds)];
    const courses = await this.coursesService.findByIds(distinctCourseIds);

    const {
      password: _,
      packages,
      role,
      ...userWithoutSensitiveInfo
    } = user.toObject();

    const { token, expiresIn, permissions } =
      await this.authService.login(user);

    return {
      token,
      profile_info: userWithoutSensitiveInfo,
      role,
      courses,
      status: HttpStatus.OK,
      message: 'Login' + Messages.successful,
    };
  }

  @Get('auth/data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all courses for an institute' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            courses: { type: 'array', items: { type: 'object' } },
            packages: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve courses for institute',
  })
  async getDataForUser(@Headers('authorization') authHeader: string) {
    try {
      if (!authHeader) {
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'Authorization header not found',
        };
      }

      const token = authHeader.split(' ')[1];
      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
      } catch (err) {
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'Invalid token',
        };
      }

      const userId = decodedToken.sub;
      const user = await this.usersService.getInstituteUser(userId, true);

      if (!user) {
        return {
          status: HttpStatus.EXPECTATION_FAILED,
          message: 'Expectation failed! unable to retrieve data',
        };
      }

      const courseIds = user.packages.map((pkg) => pkg.toObject().course);

      const distinctCourseIds = [...new Set(courseIds)];
      const courses = await this.coursesService.findByIds(distinctCourseIds);

      const {
        password: _,
        packages,
        role,
        ...userWithoutSensitiveInfo
      } = user.toObject();

      const {
        token: authToken,
        expiresIn,
        permissions,
      } = await this.authService.login(user);

      return {
        status: HttpStatus.OK,
        message: 'Data retrieved successfully',
        data: {
          token: authToken,
          profile_info: userWithoutSensitiveInfo,
          role,
          courses,
        },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve courses for institute',
        error: error.message,
      };
    }
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP verified successfully',
  })
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP resent successfully',
  })
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
  })
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

  @Post('upload/document')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        message: { type: 'string' },
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Failed to upload document' })
  async uploadDocument(@UploadedFile() file: Express.Multer.File): Promise<{ status: number, message: string, url?: string }> {
    if (!file) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'File is required',
      };
    }
    try {
      const fileUrl = await this.s3Service.uploadAndSaveDocument(file);
      return {
        status: HttpStatus.OK,
        message: 'Document uploaded successfully',
        url: fileUrl,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to upload document',
      };
    }
  }
}
