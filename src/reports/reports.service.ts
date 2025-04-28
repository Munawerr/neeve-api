import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportStatus, ReportType } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { FilterReportDto } from './dto/filter-report.dto';
import { ReportGeneratorService } from './services/report-generator.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(User.name) private userModel: Model<User>,
    private reportGeneratorService: ReportGeneratorService,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    userId: string,
  ): Promise<Report> {
    // Verify user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate required fields based on report type
    this.validateReportFields(createReportDto);

    // Create a new report
    const newReport = new this.reportModel({
      ...createReportDto,
      createdBy: userId,
      status: ReportStatus.PENDING,
    });

    // Save the report
    const savedReport = await newReport.save();

    // Start generating the report asynchronously
    this.reportGeneratorService
      .generateReport(savedReport._id as string)
      .catch((error) =>
        console.error(`Report generation error: ${error.message}`),
      );

    return savedReport;
  }

  private validateReportFields(createReportDto: CreateReportDto): void {
    const { reportType } = createReportDto;

    switch (reportType) {
      case ReportType.STUDENT:
        if (!createReportDto.student) {
          throw new BadRequestException(
            'Student ID is required for student reports',
          );
        }
        break;
      case ReportType.SUBJECT:
        if (!createReportDto.subject) {
          throw new BadRequestException(
            'Subject ID is required for subject reports',
          );
        }
        break;
      case ReportType.COURSE:
        if (!createReportDto.course) {
          throw new BadRequestException(
            'Course ID is required for course reports',
          );
        }
        break;
      case ReportType.PACKAGE:
        if (!createReportDto.package) {
          throw new BadRequestException(
            'Package ID is required for package reports',
          );
        }
        break;
      case ReportType.TEST:
        if (!createReportDto.test) {
          throw new BadRequestException('Test ID is required for test reports');
        }
        break;
      case ReportType.INSTITUTE:
        if (!createReportDto.institute) {
          throw new BadRequestException(
            'Institute ID is required for institute reports',
          );
        }
        break;
      // Overall report doesn't require specific entity IDs
    }
  }

  async findAll(
    filterReportDto: FilterReportDto,
    userId: string,
    isAdmin: boolean,
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ reports: Report[]; total: number }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build query based on filters
    const query: any = {};

    // Non-admins can only see their own reports or reports for their institute
    if (!isAdmin) {
      const instituteId = user.institute?.toString();
      query.$or = [{ createdBy: userId }, { institute: instituteId }];
    }

    // Apply search if provided
    if (search) {
      query.$or = query.$or || [];
      query.$or.push(
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      );
    }

    // Apply filters if provided
    if (filterReportDto.name) {
      query.name = { $regex: filterReportDto.name, $options: 'i' };
    }
    if (filterReportDto.reportType) {
      query.reportType = filterReportDto.reportType;
    }
    if (filterReportDto.format) {
      query.format = filterReportDto.format;
    }
    if (filterReportDto.status) {
      query.status = filterReportDto.status;
    }
    if (filterReportDto.institute) {
      query.institute = filterReportDto.institute;
    }
    if (filterReportDto.student) {
      query.student = filterReportDto.student;
    }
    if (filterReportDto.subject) {
      query.subject = filterReportDto.subject;
    }
    if (filterReportDto.course) {
      query.course = filterReportDto.course;
    }
    if (filterReportDto.package) {
      query.package = filterReportDto.package;
    }
    if (filterReportDto.test) {
      query.test = filterReportDto.test;
    }

    // Date range filtering
    if (filterReportDto.startDate || filterReportDto.endDate) {
      query.createdAt = {};
      if (filterReportDto.startDate) {
        query.createdAt.$gte = new Date(filterReportDto.startDate);
      }
      if (filterReportDto.endDate) {
        query.createdAt.$lte = new Date(filterReportDto.endDate);
      }
    }

    // Get total count for pagination
    const total = await this.reportModel.countDocuments(query);

    // Get paginated reports
    const reports = await this.reportModel
      .find(query)
      .populate('createdBy', 'full_name email')
      .populate('institute', 'full_name')
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .populate('course', 'title')
      .populate('package', 'title')
      .populate('test', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { reports, total };
  }

  async findOne(id: string, userId: string, isAdmin: boolean): Promise<Report> {
    const report = await this.reportModel
      .findById(id)
      .populate('createdBy', 'full_name email')
      .populate('institute', 'full_name')
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .populate('course', 'title')
      .populate('package', 'title')
      .populate('test', 'title')
      .exec();

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Check permissions - only admin, report creator, or institute members can access
    const user = await this.userModel.findById(userId);
    if (
      !isAdmin &&
      report.createdBy.toString() !== userId &&
      report.institute?.toString() !== user?.institute?.toString()
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this report',
      );
    }

    return report;
  }

  async regenerate(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<Report> {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Check permissions - only admin or report creator can regenerate
    if (!isAdmin && report.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to regenerate this report',
      );
    }

    // Update status and reset fields
    report.status = ReportStatus.PENDING;
    report.fileUrl = '';
    report.errorMessage = '';
    // Reset the generatedAt field
    // if (report.generatedAt) delete report.generatedAt;

    await report.save();

    // Start generating the report asynchronously
    this.reportGeneratorService
      .generateReport(report._id as string)
      .catch((error) =>
        console.error(`Report regeneration error: ${error.message}`),
      );

    return report;
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Check permissions - only admin or report creator can delete
    if (!isAdmin && report.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this report',
      );
    }

    await this.reportModel.findByIdAndDelete(id);
  }

  async updateReportStatus(
    id: string,
    status: ReportStatus,
    fileUrl?: string,
    errorMessage?: string,
  ): Promise<Report> {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    report.status = status;

    if (status === ReportStatus.COMPLETED) {
      report.fileUrl = fileUrl || '';
      report.generatedAt = new Date();
    } else if (status === ReportStatus.FAILED) {
      report.errorMessage = errorMessage || '';
    }

    return report.save();
  }
}
