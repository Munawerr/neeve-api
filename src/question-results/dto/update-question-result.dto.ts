import { ApiPropertyOptional } from '@nestjs/swagger';

class OptionDto {
  @ApiPropertyOptional({ example: 'Option 1' })
  readonly text?: string;

  @ApiPropertyOptional({ example: true })
  readonly isCorrect?: boolean;

  @ApiPropertyOptional({ example: false })
  readonly isChecked?: boolean;
}

export class UpdateQuestionResultDto {
  @ApiPropertyOptional({ example: 'What is the capital of France?' })
  readonly questionText?: string;

  @ApiPropertyOptional({ example: new Date() })
  readonly createdAt?: Date;

  @ApiPropertyOptional({ type: [OptionDto] })
  readonly options?: OptionDto[];

  @ApiPropertyOptional({ example: 'The capital of France is Paris.' })
  readonly corAnsExp?: string;
}
