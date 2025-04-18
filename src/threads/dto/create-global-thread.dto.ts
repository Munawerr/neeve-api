import { ApiProperty } from '@nestjs/swagger';

export class CreateGlobalThreadDto {
  @ApiProperty({ example: 'User123' })
  readonly user: string;

  @ApiProperty({ example: 'Institute123', required: false })
  readonly institute?: string;

  @ApiProperty({ example: 'Class123', required: false })
  readonly class?: string;

  @ApiProperty({ example: 'Thread Title' })
  readonly title: string;

  @ApiProperty({ example: 'This is the content of the thread.' })
  readonly content: string;
  
  @ApiProperty({ example: true, default: true })
  readonly isGlobal: boolean = true;
}
