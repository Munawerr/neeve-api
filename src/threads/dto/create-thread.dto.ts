import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({ example: 'User123' })
  user: string;

  @ApiProperty({ example: 'Topic123', required: false })
  readonly topic?: string;

  @ApiProperty({ example: 'Thread Title' })
  readonly title: string;

  @ApiProperty({ example: 'This is the content of the thread.' })
  readonly content: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether this thread is global (admin only)',
  })
  readonly isGlobal?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether this thread is restricted to an institute',
  })
  isInstituteOnly?: boolean;

  @ApiProperty({ example: 'Institute123', required: false })
  readonly institute?: string;

  @ApiProperty({ example: 'Class123', required: false })
  readonly class?: string;
}
