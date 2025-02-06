import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'CLS001' })
  readonly code: string;

  @ApiProperty({ example: 'Math Class' })
  readonly title: string;
}
