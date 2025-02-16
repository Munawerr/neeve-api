import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

class OptionDto {
  @ApiProperty({ example: 'Option 1' })
  readonly text: string;

  @ApiProperty({ example: true })
  readonly isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is the capital of France?' })
  readonly text: string;

  @ApiProperty({
    example: 'The capital of France is Paris.',
    description: 'Correct Answer Explanation',
  })
  readonly corAnsExp: string;

  @ApiProperty({ type: [OptionDto] })
  readonly options: OptionDto[];
}
