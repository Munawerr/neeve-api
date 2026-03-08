import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Report } from '../schemas/report.schema';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class ReportAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { params, method } = request;

    // Allow access for creation operations or listing operations without specific report
    if (method === 'POST' && !params.id) return true;
    if (method === 'GET' && !params.id) return true;
    if (method === 'GET' && params.id === 'types') return true;

    // For operations that target a specific report (GET /:id, PUT /:id, DELETE /:id)
    if (params.id) {
      const token = request.headers.authorization
        ? request.headers.authorization.split(' ')[1]
        : null;
      
      if (!token) {
        throw new ForbiddenException('Authentication required');
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        const userId = decoded.sub;
        const isAdmin = decoded.role === 'admin';

        // Admin has full access
        if (isAdmin) return true;

        const user = await this.userModel.findById(userId);
        if (!user) {
          throw new ForbiddenException('User not found');
        }

        // For specific report operations, check that the user has access
        const report = await this.reportModel.findById(params.id);
        if (!report) {
          return false; // Let the controller handle the 'not found' case
        }

        // User can access if they created the report or if they belong to the same institute
        const isCreator = report.createdBy.toString() === userId;
        const sameInstitute = 
          report.institute && 
          user.institute && 
          report.institute.toString() === user.institute.toString();

        if (isCreator || sameInstitute) {
          return true;
        }

        throw new ForbiddenException('You do not have permission to access this report');
      } catch (error) {
        throw new ForbiddenException('Invalid authentication token or insufficient permissions');
      }
    }

    return false;
  }
}