import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { User } from '../../users/schemas/user.schema';
import { Report } from '../schemas/report.schema';

@Injectable()
export class ReportAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new ForbiddenException('Authentication required');
    }

    try {
      // Decode JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      const userId = decoded.sub;
      const isAdmin = decoded.role === 'admin';
      
      // Admins have full access to all reports
      if (isAdmin) {
        return true;
      }

      const user = await this.userModel.findById(userId).lean();
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // For report creation, ensure user has appropriate permissions
      if (request.method === 'POST' && !request.params.id) {
        // All authenticated users can create reports
        return true;
      }

      // For GET/DELETE/PUT operations on specific reports
      if (request.params.id) {
        const reportId = request.params.id;
        const report = await this.reportModel.findById(reportId).lean();
        
        if (!report) {
          throw new ForbiddenException('Report not found');
        }

        // Users can access reports they created or reports for their institute
        const isReportCreator = report.createdBy?.toString() === userId;
        const isInstituteReport = user.institute && 
                                report.institute && 
                                report.institute.toString() === user.institute.toString();
        
        if (isReportCreator || isInstituteReport) {
          return true;
        }
        
        throw new ForbiddenException('You do not have permission to access this report');
      }

      // For listing reports, filtering is handled at service level
      if (request.method === 'GET') {
        return true;
      }

      return false;
    } catch (error) {
      throw new ForbiddenException('Invalid token or insufficient permissions');
    }
  }
}