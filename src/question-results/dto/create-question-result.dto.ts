import { ApiProperty } from '@nestjs/swagger';

class OptionDto {
  @ApiProperty({ example: 'Option 1' })
  readonly text: string;

  @ApiProperty({ example: true })
  readonly isCorrect: boolean;

  @ApiProperty({ example: false })
  readonly isChecked: boolean;
}

export class CreateQuestionResultDto {
  @ApiProperty({ example: 'What is the capital of France?' })
  readonly questionText: string;

  @ApiProperty({ example: new Date() })
  readonly createdAt: Date;

  @ApiProperty({ type: [OptionDto] })
  readonly options: OptionDto[];

  @ApiProperty({ example: 'The capital of France is Paris.' })
  readonly corAnsExp: string;
}
