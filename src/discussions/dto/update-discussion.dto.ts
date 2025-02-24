import { ApiProperty } from '@nestjs/swagger';

export class UpdateDiscussionDto {
  @ApiProperty({ example: 'Thread123' })
  readonly thread: string;

  @ApiProperty({ example: 'User123' })
  readonly user: string;

  @ApiProperty({ example: 'This is the updated content of the discussion.' })
  readonly content: string;
}
