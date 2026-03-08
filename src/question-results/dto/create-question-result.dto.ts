import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OptionDto {
  @ApiProperty({ example: 'Option 1' })
  readonly text: string;

  @ApiProperty({ example: true })
  readonly isCorrect: boolean;

  @ApiProperty({ example: true })
  readonly isChecked: boolean;
}

export class CreateQuestionResultDto {
  @ApiProperty({ example: 'What is the capital of France?' })
  readonly questionText: string;

  @ApiProperty({ example: new Date() })
  readonly createdAt: Date;

  @ApiProperty({ type: [OptionDto] })
  readonly options: OptionDto[];

  @ApiPropertyOptional({ example: 'The capital of France is Paris.', required: false })
  readonly corAnsExp?: string;

  @ApiProperty({ required: false })
  readonly skipped?: boolean;
}
