import { Controller, Get, UseGuards, Query, Param, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginHistoryService } from './login-history.service';
import { LoginHistory } from './schemas/login-history.schema';

@ApiTags('login-history')
@Controller('login-history')
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get login history for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of records returned' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login history retrieved successfully',
    type: [LoginHistory],
  })
  async getUserLoginHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const history = await this.loginHistoryService.getUserLoginHistory(userId, limitNum);
    
    return {
      status: HttpStatus.OK,
      message: 'Login history retrieved successfully',
      data: history,
    };
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get login activity for analytics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to include' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login activity data retrieved successfully',
  })
  async getLoginActivity(@Query('days') days?: string): Promise<any> {
    const daysNum = days ? parseInt(days, 10) : 30;
    const activityData = await this.loginHistoryService.getLoginActivity(daysNum);
    
    return {
      status: HttpStatus.OK,
      message: 'Login activity data retrieved successfully',
      data: activityData,
    };
  }
}