import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat, ReportStatus, ReportType } from '../schemas/report.schema';

export class ReportResponseDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report name' })
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  description?: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  reportType: ReportType;

  @ApiProperty({ description: 'Report format', enum: ReportFormat })
  format: ReportFormat;

  @ApiProperty({ description: 'Status of the report', enum: ReportStatus })
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'URL to download the generated report' })
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Date when report was generated' })
  generatedAt?: Date;

  @ApiPropertyOptional({ description: 'Error message if report generation failed' })
  errorMessage?: string;

  @ApiProperty({ description: 'User who created the report' })
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Institute information if report is institute-specific' })
  institute?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Student information if report is student-specific' })
  student?: {
    id: string;
    name: string;
    email?: string;
  };

  @ApiPropertyOptional({ description: 'Subject information if report is subject-specific' })
  subject?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Course information if report is course-specific' })
  course?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Package information if report is package-specific' })
  package?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Test information if report is test-specific' })
  test?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Date range for report data' })
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Date when report was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Date when report was last updated' })
  updatedAt: Date;
}