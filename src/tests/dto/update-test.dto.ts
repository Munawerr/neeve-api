import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Types } from 'mongoose';
import { TestType } from '../schemas/test.schema';

export class UpdateTestDto {
  @ApiPropertyOptional({ example: 'Midterm Exam' })
  @IsOptional()
  @IsString()
  readonly title?: string;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  @IsOptional()
  readonly topic?: Types.ObjectId;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  @IsOptional()
  readonly subject?: Types.ObjectId;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly marksPerQuestion?: number;

  @ApiPropertyOptional({ example: 120, description: 'In Minutes' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly testDuration?: number;

  @ApiPropertyOptional({ example: TestType.TEST, enum: TestType })
  @IsOptional()
  @IsEnum(TestType)
  readonly testType?: TestType;

  @ApiProperty({
    description: 'Number of questions a student can skip during the test',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly skipableQuestionsCount?: number;
}
