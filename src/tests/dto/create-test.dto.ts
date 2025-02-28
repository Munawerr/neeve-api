import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TestType } from '../schemas/test.schema';

export class CreateTestDto {
  @ApiProperty({ example: 'Midterm Exam' })
  readonly title: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca', required: false })
  readonly topic?: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  readonly subject: Types.ObjectId;

  @ApiProperty({ example: 5 })
  readonly marksPerQuestion: number;

  @ApiProperty({ example: 120 })
  readonly testDuration: number;

  @ApiProperty({ example: TestType.TEST, enum: TestType })
  readonly testType: TestType;
}
