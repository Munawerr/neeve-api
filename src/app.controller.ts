import {
  Controller,
  Body,
  Post,
  Get,
  HttpStatus,
  UseGuards,
  Headers,
  Req,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

import {
  ForgotPasswordDto,
  VerifyOtpDto,
  ResendOtpDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { CoursesService } from './courses/courses.service';
import { UsersService } from './users/users.service';
import { Course } from './courses/schemas/course.schema';
import { AnalyticsService } from './analytics/analytics.service';

import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Messages } from './utils/messages';
import { LoginDto } from './dto/login.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
    private readonly analyticsService: AnalyticsService, // Add analytics service
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
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<{
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
    const user = await this.authService.validateUserWithRequest(
      email,
      password,
      req,
    );

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
        ? '000000'
        : Math.floor(100000 + Math.random() * 999999).toString();
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
        ? '000000'
        : Math.floor(100000 + Math.random() * 999999).toString();
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

  @Post('auth/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid password',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Headers('authorization') authHeader: string,
  ) {
    const { currentPassword, newPassword } = changePasswordDto;
    const token = authHeader.split(' ')[1];
    let decodedToken;
    decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
    const userId: string = decodedToken.sub;

    const isChanged = await this.authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
    if (!isChanged) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: Messages.invalidPassword,
      };
    }
    return {
      status: HttpStatus.OK,
      message: Messages.passwordChanged,
    };
  }

  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics data for dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve analytics data',
  })
  async getDashboardAnalytics(@Headers('authorization') authHeader: string) {
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

      // Try to get data from cache
      const cacheKey = `dashboard_analytics_${userId}`;
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return {
          status: HttpStatus.OK,
          message: 'Analytics data retrieved from cache',
          data: cachedData,
        };
      }

      const user = await this.usersService.getInstituteUser(userId, true);

      if (!user) {
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'User not found',
        };
      }

      let analyticsData = {};
      const isAdmin = user.toObject().role.slug === 'admin';

      if (isAdmin) {
        const totalUsers = await this.usersService.countAllUsers();
        const activeUsers = await this.usersService.countActiveUsers(30);
        const totalInstitutes = await this.usersService.countInstitutes();
        const totalCourses = await this.coursesService.countAllCourses();

        const userGrowthTrend = await this.usersService.getUserGrowthTrend(6);
        const instituteGrowthTrend =
          await this.usersService.getInstituteGrowthTrend(6);
        const topInstitutes =
          await this.usersService.getTopPerformingInstitutes(5);
        const hourlyEngagement = await this.usersService.getHourlyEngagement();

        // Get resource and video analytics
        const resourceViewsLast7Days =
          await this.analyticsService.getResourceViewsLast7Days();
        const videoViewsLast7Days =
          await this.analyticsService.getVideoViewsLast7Days();
        const openDiscussionsCount =
          await this.analyticsService.getOpenDiscussionsCount();
        const liveClassesMetrics =
          await this.analyticsService.getLiveClassesMetrics();

        // Get last 7 days test completion data
        const testCompletionTrend =
          await this.coursesService.getTestsCompletedByDay(7);

        analyticsData = {
          userMetrics: {
            totalUsers,
            activeUsers,
            newUsersTrend: await this.usersService.getNewUsersByMonth(6),
            engagementTrend: await this.usersService.getUserEngagementByDay(30),
            growthTrend: userGrowthTrend,
            hourlyEngagement,
          },
          instituteMetrics: {
            totalInstitutes,
            growthTrend: instituteGrowthTrend,
            topPerformers: topInstitutes,
          },
          courseMetrics: {
            totalCourses,
            popularCourses: await this.coursesService.getMostPopularCourses(5),
          },
          testMetrics: {
            totalTests: await this.coursesService.countAllTests(),
            totalAttempts: await this.coursesService.countAllTestAttempts(),
            testCompletionTrend,
            mostPopularTests: await this.coursesService.getMostPopularTests(5),
            averageScores: await this.coursesService.getAverageTestScores(),
          },
          contentMetrics: {
            resourceViewsLast7Days,
            videoViewsLast7Days,
            openDiscussionsCount,
            liveClassesMetrics,
          },
        };
      } else {
        const user_id = user._id as string;
        const totalUsers = await this.usersService.countAllUsers(user_id);
        const activeUsers = await this.usersService.countActiveUsers(
          30,
          user_id,
        );
        const userGrowthTrend = await this.usersService.getUserGrowthTrend(
          6,
          user_id,
        );
        const hourlyEngagement =
          await this.usersService.getHourlyEngagement(user_id);

        // Get all students for this institute and count those with success chance >= 80%
        const students = await this.usersService.getInstituteUsers(user_id);
        let topStudentsCount = 0;
        for (const student of students) {
          const analytics = await this.usersService.getUserAnalytics(student);
          if (analytics.successChance >= 80) {
            topStudentsCount++;
          }
        }

        const totalCourses = user.packages.length;

        // Get resource and video analytics
        const resourceViewsLast7Days =
          await this.analyticsService.getResourceViewsLast7Days(user_id);
        const videoViewsLast7Days =
          await this.analyticsService.getVideoViewsLast7Days(user_id);
        const openDiscussionsCount =
          await this.analyticsService.getOpenDiscussionsCount(user_id);
        const liveClassesMetrics =
          await this.analyticsService.getLiveClassesMetrics(user_id);

        analyticsData = {
          userMetrics: {
            totalUsers,
            activeUsers,
            topStudents: topStudentsCount,
            newUsersTrend: await this.usersService.getNewInstituteUsersByMonth(
              user_id,
              6,
            ),
            engagementTrend:
              await this.usersService.getInstituteUserEngagementByDay(
                user_id,
                30,
              ),
            growthTrend: userGrowthTrend,
            hourlyEngagement,
          },
          courseMetrics: {
            totalCourses,
            popularCourses:
              await this.coursesService.getMostPopularInstituteCourses(
                user_id,
                5,
              ),
          },
          testMetrics: {
            totalTests: await this.coursesService.countAllTests(),
            totalAttempts: await this.coursesService.countAllTestAttempts(),
            testCompletionTrend:
              await this.coursesService.getTestsCompletedByDay(7, user_id),
            mostPopularTests: await this.coursesService.getMostPopularTests(5),
            averageScores: await this.coursesService.getAverageTestScores(),
          },
          contentMetrics: {
            resourceViewsLast7Days,
            videoViewsLast7Days,
            openDiscussionsCount,
            liveClassesMetrics,
          },
        };
      }

      // Store analytics data in cache before returning
      await this.cacheManager.set(cacheKey, analyticsData, 300000); // Cache for 5 minutes

      return {
        status: HttpStatus.OK,
        message: 'Analytics data retrieved successfully',
        data: analyticsData,
      };
    } catch (error) {
      console.error('Error retrieving analytics data:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve analytics data: ${error.name}`,
        error: error.message,
      };
    }
  }
}
