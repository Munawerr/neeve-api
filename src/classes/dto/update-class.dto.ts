import { ApiProperty } from '@nestjs/swagger';

export class UpdateClassDto {
  @ApiProperty({ example: 'CLS001', required: false })
  readonly code?: string;

  @ApiProperty({ example: 'Math Class', required: false })
  readonly title?: string;
}
