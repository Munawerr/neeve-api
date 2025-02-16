import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ResultStatus } from '../schemas/result.schema';

export class CreateResultDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  readonly test: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109cb' })
  readonly subject: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109cc' })
  readonly student: Types.ObjectId;

  @ApiProperty({ example: new Date() })
  readonly startedAt: Date;

  @ApiProperty({ example: new Date() })
  readonly finishedAt: Date;

  @ApiProperty({ example: ResultStatus.FINISHED, enum: ResultStatus })
  readonly status: ResultStatus;

  @ApiProperty({ example: 10 })
  readonly numOfQuestions: number;

  @ApiProperty({ example: 5 })
  readonly marksPerQuestion: number;
}
