import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, ValidateNested, IsObject, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportFormat, ReportType } from '../schemas/report.schema';
import { Prop } from '@nestjs/mongoose';

class DateRangeDto {
  @ApiProperty({ description: 'Start date of report data' })
  @IsDateString()
  @Prop({ type: String })
  startDate: string;

  @ApiProperty({ description: 'End date of report data' })
  @IsDateString()
  @Prop({ type: String })
  endDate: string;
}

export class CreateReportDto {
  @ApiProperty({ description: 'Report name', example: 'Q1 Performance Report' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Report description', example: 'Quarterly performance report for students' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Type of report', enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ description: 'Format of the generated report', enum: ReportFormat })
  @IsEnum(ReportFormat)
  format: ReportFormat;

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

  @ApiPropertyOptional({ description: 'Date range for report data' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  @Prop({ type: DateRangeDto })
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Additional filters for report',
    example: { 'gender': 'male', 'score': { 'gt': 70 } }
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}