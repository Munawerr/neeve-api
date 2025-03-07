import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResultStatus } from '../schemas/result.schema';

export class MarksSummaryDto {
  @ApiPropertyOptional({ example: 100 })
  readonly totalMarks?: number;

  @ApiPropertyOptional({ example: 90 })
  readonly obtainedMarks?: number;

  @ApiPropertyOptional({ example: '90' })
  readonly averageMarks?: number;
}
export class UpdateResultDto {
  // @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  // readonly test?: Types.ObjectId;

  // @ApiPropertyOptional({ example: '60d0fe4f5311236168a109cb' })
  // readonly subject?: Types.ObjectId;

  // @ApiPropertyOptional({ example: '60d0fe4f5311236168a109cc' })
  // readonly student?: Types.ObjectId;

  // @ApiPropertyOptional({ example: new Date() })
  // readonly startedAt?: Date;

  @ApiPropertyOptional({ example: new Date() })
  finishedAt?: Date;

  @ApiPropertyOptional({ example: ResultStatus.FINISHED, enum: ResultStatus })
  status?: ResultStatus;

  @ApiPropertyOptional({ type: MarksSummaryDto })
  marksSummary?: MarksSummaryDto;

  // @ApiPropertyOptional({ example: 10 })
  // readonly numOfQuestions?: number;

  // @ApiPropertyOptional({ example: 5 })
  // readonly marksPerQuestion?: number;
}
