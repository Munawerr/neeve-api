import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ReportType {
  STUDENT = 'student',
  SUBJECT = 'subject',
  COURSE = 'course',
  PACKAGE = 'package',
  TEST = 'test',
  INSTITUTE = 'institute',
  OVERALL = 'overall',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class DateRange {
  @Prop({ type: String })
  startDate: string;

  @Prop({ type: String })
  endDate: string;
}

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ReportType })
  reportType: ReportType;

  @Prop({ required: true, enum: ReportFormat })
  format: ReportFormat;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  institute: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  student: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject' })
  subject: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course' })
  course: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Package' })
  package: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Test' })
  test: MongooseSchema.Types.ObjectId;

  @Prop({ type: () => DateRange })
  dateRange?: DateRange;

  @Prop({ required: true, enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Prop()
  fileUrl: string;

  @Prop()
  generatedAt: Date;

  @Prop()
  errorMessage: string;

  @Prop({ type: Object })
  filters: Record<string, any>;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Optimizes report listing filters and createdAt sort.
ReportSchema.index({ createdBy: 1, createdAt: -1 });
ReportSchema.index({ institute: 1, createdAt: -1 });
ReportSchema.index({ student: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reportType: 1, createdAt: -1 });
ReportSchema.index({ test: 1, createdAt: -1 });
