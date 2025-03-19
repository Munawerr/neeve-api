import { ApiProperty } from '@nestjs/swagger';
import { ResultStatus } from '../schemas/result.schema';

export class CreateResultDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  readonly test: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109cb' })
  readonly subject: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109cc' })
  readonly student: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109cd' })
  readonly institute: string;

  @ApiProperty({ example: 'Mock' })
  readonly testType: string;

  @ApiProperty({ example: 10 })
  readonly numOfQuestions: number;

  @ApiProperty({ example: 5 })
  readonly marksPerQuestion: number;
}

export class CreateResultServiceDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  readonly test: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109cb' })
  readonly subject: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109cc' })
  readonly student: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109cd' })
  readonly institute: string;

  @ApiProperty({ example: new Date() })
  readonly startedAt: Date;

  @ApiProperty({ example: ResultStatus.FINISHED, enum: ResultStatus })
  readonly status?: ResultStatus;

  @ApiProperty({ example: 'Mock' })
  readonly testType: string;

  @ApiProperty({ example: 10 })
  readonly numOfQuestions: number;

  @ApiProperty({ example: 5 })
  readonly marksPerQuestion: number;
}
