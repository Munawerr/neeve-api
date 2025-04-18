import { ApiProperty } from '@nestjs/swagger';

export class UpdateThreadDto {
  @ApiProperty({ example: 'User123', required: false })
  readonly user?: string;

  @ApiProperty({ example: 'Topic123', required: false })
  readonly topic?: string;

  @ApiProperty({ example: 'Updated Thread Title', required: false })
  readonly title?: string;

  @ApiProperty({ example: 'This is the updated content of the thread.', required: false })
  readonly content?: string;
  
  @ApiProperty({ example: false, required: false, description: 'Whether this thread is global (admin only)' })
  readonly isGlobal?: boolean;
  
  @ApiProperty({ example: false, required: false, description: 'Whether this thread is restricted to an institute' })
  readonly isInstituteOnly?: boolean;
  
  @ApiProperty({ example: 'Institute123', required: false })
  readonly institute?: string;
}
