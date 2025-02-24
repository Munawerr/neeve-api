import { ApiProperty } from '@nestjs/swagger';

export class UpdateThreadDto {
  @ApiProperty({ example: 'User123' })
  readonly user: string;

  @ApiProperty({ example: 'Topic123' })
  readonly topic: string;

  @ApiProperty({ example: 'Updated Thread Title' })
  readonly title: string;

  @ApiProperty({ example: 'This is the updated content of the thread.' })
  readonly content: string;
}
