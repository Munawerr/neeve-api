import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TestType } from '../schemas/test.schema';

export class CreateTestDto {
  @ApiProperty({ example: 'Midterm Exam' })
  title: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca', required: false })
  topic?: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  subject: Types.ObjectId;

  @ApiProperty({ example: 5 })
  marksPerQuestion: number;

  @ApiProperty({ example: 120 })
  testDuration: number;

  @ApiProperty({ example: TestType.TEST, enum: TestType })
  testType: TestType;
}
