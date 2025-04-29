import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfReportService } from './services/pdf-report.service';
import { ExcelReportService } from './services/excel-report.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { Result, ResultSchema } from '../results/schemas/result.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Test, TestSchema } from '../tests/schemas/test.schema';
import { Subject, SubjectSchema } from '../subjects/schemas/subject.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { Package, PackageSchema } from '../packages/schemas/package.schema';
import { UsersService } from '../users/users.service';
import { ResultsService } from '../results/results.service';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { S3Service } from '../s3/s3.service';
import { Report, ReportSchema } from './schemas/report.schema';
import {
  LoginHistory,
  LoginHistorySchema,
} from '../auth/schemas/login-history.schema';
import { Topic, TopicSchema } from 'src/topics/schemas/topic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Result.name, schema: ResultSchema },
      { name: User.name, schema: UserSchema },
      { name: Test.name, schema: TestSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Package.name, schema: PackageSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    PdfReportService,
    ExcelReportService,
    ReportGeneratorService,
    ResultsService,
    UsersService,
    S3Service,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
