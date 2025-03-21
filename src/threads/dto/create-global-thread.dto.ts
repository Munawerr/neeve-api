import { ApiProperty } from '@nestjs/swagger';

export class CreateGlobalThreadDto {
  @ApiProperty({ example: 'User123' })
  readonly user: string;

  @ApiProperty({ example: 'User123' })
  readonly institute: string;

  @ApiProperty({ example: 'User123' })
  readonly class: string;

  @ApiProperty({ example: 'Thread Title' })
  readonly title: string;

  @ApiProperty({ example: 'This is the content of the thread.' })
  readonly content: string;
}
