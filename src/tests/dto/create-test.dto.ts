import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TestType } from '../schemas/test.schema';

export class CreateTestDto {
  @ApiProperty({
    description: 'Title of the test',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Topic ID',
    type: String,
  })
  @IsOptional()
  topic: string;

  @ApiProperty({
    description: 'Subject ID',
    type: String,
  })
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Marks per question',
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  marksPerQuestion: number;

  @ApiProperty({
    description: 'Test duration in minutes',
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  testDuration: number;

  @ApiProperty({
    description: 'Type of test',
    enum: TestType,
  })
  @IsNotEmpty()
  @IsEnum(TestType)
  testType: TestType;

  @ApiProperty({
    description: 'Number of questions a student can skip during the test',
    type: Number,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  skipableQuestionsCount: number;
}
