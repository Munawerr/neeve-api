import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkUploadSubjectResultDto {
  @ApiProperty({ description: 'MongoDB ObjectId of the matched Subject document' })
  @IsString()
  subjectId: string;

  @ApiProperty({ description: 'Marks obtained by student (e.g. 39.00 from "39.00/180")' })
  @IsNumber()
  @Min(0)
  obtained: number;

  @ApiProperty({ description: 'Total marks for this subject (e.g. 180 from "39.00/180")' })
  @IsNumber()
  @Min(1)
  total: number;
}

export class BulkUploadConfirmedRowDto {
  @ApiProperty({ description: 'MongoDB ObjectId of the matched Student (User) document' })
  @IsString()
  studentId: string;

  @ApiProperty({ type: [BulkUploadSubjectResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUploadSubjectResultDto)
  subjectResults: BulkUploadSubjectResultDto[];

  @ApiProperty({ description: 'Total exam time in seconds from the CSV "Time taken" column' })
  @IsNumber()
  @Min(0)
  timeTaken: number;

  @ApiProperty({ description: 'Student rank from the CSV "Rank" column' })
  @IsNumber()
  @Min(1)
  rank: number;

  @ApiProperty({ description: 'Total students in the exam (used for rank context display)' })
  @IsNumber()
  @Min(1)
  totalStudents: number;

  @ApiProperty({ description: 'External report card URL from the CSV "Link" column', required: false })
  @IsOptional()
  @IsString()
  reportCardLink?: string;

  @ApiProperty({ description: 'Test type (mock, practice, test, screening)', required: false, default: 'mock' })
  @IsOptional()
  @IsString()
  testType?: string;
}

export class BulkUploadSubmitDto {
  @ApiProperty({ type: [BulkUploadConfirmedRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUploadConfirmedRowDto)
  rows: BulkUploadConfirmedRowDto[];
}
