import { ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TestType } from '../schemas/test.schema';

export class UpdateTestDto {
  @ApiPropertyOptional({ example: 'Midterm Exam' })
  readonly title?: string;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  readonly topic?: Types.ObjectId;

  @ApiPropertyOptional({ example: 5 })
  readonly marksPerQuestion?: number;

  @ApiPropertyOptional({ example: 120, description: 'In Minutes' })
  readonly testDuration?: number;

  @ApiPropertyOptional({ example: TestType.TEST, enum: TestType })
  readonly testType?: TestType;
}
