import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsMongoId, IsDateString } from 'class-validator';
import { ReportFormat, ReportStatus, ReportType } from '../schemas/report.schema';

export class FilterReportDto {
  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Type of report', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @ApiPropertyOptional({ description: 'Format of the report', enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Status of the report', enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Institute ID for institute-specific reports' })
  @IsOptional()
  @IsMongoId()
  institute?: string;

  @ApiPropertyOptional({ description: 'Student ID for student-specific reports' })
  @IsOptional()
  @IsMongoId()
  student?: string;

  @ApiPropertyOptional({ description: 'Subject ID for subject-specific reports' })
  @IsOptional()
  @IsMongoId()
  subject?: string;

  @ApiPropertyOptional({ description: 'Course ID for course-specific reports' })
  @IsOptional()
  @IsMongoId()
  course?: string;

  @ApiPropertyOptional({ description: 'Package ID for package-specific reports' })
  @IsOptional()
  @IsMongoId()
  package?: string;

  @ApiPropertyOptional({ description: 'Test ID for test-specific reports' })
  @IsOptional()
  @IsMongoId()
  test?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering reports' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering reports' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}