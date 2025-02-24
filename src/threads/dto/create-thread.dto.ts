import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({ example: 'User123' })
  readonly user: string;

  @ApiProperty({ example: 'Topic123' })
  readonly topic: string;

  @ApiProperty({ example: 'Thread Title' })
  readonly title: string;

  @ApiProperty({ example: 'This is the content of the thread.' })
  readonly content: string;
}
