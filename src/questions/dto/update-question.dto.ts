import { ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

class OptionDto {
  @ApiPropertyOptional({ example: 'Option 1' })
  readonly text?: string;

  @ApiPropertyOptional({ example: true })
  readonly isCorrect?: boolean;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: 'What is the capital of France?' })
  readonly text?: string;

  @ApiPropertyOptional({ example: 'The capital of France is Paris.' })
  readonly corAnsExp?: string;

  @ApiPropertyOptional({ type: [OptionDto] })
  readonly options?: OptionDto[];

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109ca' })
  readonly test?: Types.ObjectId;
}
