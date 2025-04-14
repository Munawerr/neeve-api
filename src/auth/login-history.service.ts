import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginHistory } from './schemas/login-history.schema';
import { CreateLoginHistoryDto } from './dto/login-history.dto';
import { Request } from 'express';

@Injectable()
export class LoginHistoryService {
  constructor(
    @InjectModel(LoginHistory.name)
    private loginHistoryModel: Model<LoginHistory>,
  ) {}

  /**
   * Create a new login history record
   */
  async createLoginRecord(
    createLoginHistoryDto: CreateLoginHistoryDto,
  ): Promise<LoginHistory> {
    const createdLoginHistory = new this.loginHistoryModel(
      createLoginHistoryDto,
    );
    return createdLoginHistory.save();
  }

  /**
   * Log a successful login attempt with request information
   */
  async logSuccessfulLogin(
    userId: string,
    email: string | null,
    req: Request,
  ): Promise<LoginHistory> {
    const loginHistoryDto: CreateLoginHistoryDto = {
      userId,
      ipAddress: this.getIpFromRequest(req),
      userAgent: req.headers['user-agent'],
      loginTime: new Date(),
      deviceInfo: this.parseDeviceInfo(req.headers['user-agent'] || ''),
      success: true,
    };

    // Only add email if it's provided
    if (email) {
      loginHistoryDto.email = email;
    }

    return this.createLoginRecord(loginHistoryDto);
  }

  /**
   * Log a failed login attempt with request information
   */
  async logFailedLogin(
    email: string | null,
    req: Request,
  ): Promise<LoginHistory | null> {
    try {
      const loginHistoryDto: Partial<CreateLoginHistoryDto> = {
        ipAddress: this.getIpFromRequest(req),
        userAgent: req.headers['user-agent'],
        loginTime: new Date(),
        deviceInfo: this.parseDeviceInfo(req.headers['user-agent'] || ''),
        success: false,
      };

      // Only add email if it's provided
      if (email) {
        loginHistoryDto.email = email;
      }

      const createdLoginHistory = new this.loginHistoryModel(loginHistoryDto);
      return createdLoginHistory.save();
    } catch (error) {
      console.error('Failed to log unsuccessful login:', error);
      return null;
    }
  }

  /**
   * Get user login history
   */
  async getUserLoginHistory(
    userId: string,
    limit = 10,
  ): Promise<LoginHistory[]> {
    return this.loginHistoryModel
      .find({ userId })
      .sort({ loginTime: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get login activity for analytics
   */
  async getLoginActivity(days: number): Promise<any[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const loginData = await this.loginHistoryModel.aggregate([
      {
        $match: {
          loginTime: { $gte: date },
          success: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$loginTime' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return loginData.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }

  /**
   * Extract IP address from request
   */
  private getIpFromRequest(req: Request): string {
    return (
      req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress ||
      ''
    );
  }

  /**
   * Parse basic device info from user agent
   */
  private parseDeviceInfo(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    let deviceInfo = '';

    // Check for mobile devices
    if (userAgent.match(/Android/i)) {
      deviceInfo = 'Android';
    } else if (userAgent.match(/iPhone|iPad|iPod/i)) {
      deviceInfo = 'iOS';
    } else if (userAgent.match(/Windows Phone/i)) {
      deviceInfo = 'Windows Phone';
    } else if (userAgent.match(/Windows NT/i)) {
      deviceInfo = 'Windows';
    } else if (userAgent.match(/Macintosh|Mac OS X/i)) {
      deviceInfo = 'Mac';
    } else if (userAgent.match(/Linux/i)) {
      deviceInfo = 'Linux';
    } else {
      deviceInfo = 'Unknown';
    }

    return deviceInfo;
  }
}
