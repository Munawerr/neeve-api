import { ApiProperty } from '@nestjs/swagger';

export class UpdateCourseDto {
  @ApiProperty({ example: 'CRS001', required: false })
  readonly code?: string;

  @ApiProperty({ example: 'Introduction to Math', required: false })
  readonly title?: string;

  @ApiProperty({
    example: { solid: '#000000', accent: '#FFFFFF' },
    required: false,
  })
  readonly color?: {
    solid: string;
    accent: string;
  };

  @ApiProperty({ example: 'http://example.com/icon.png', required: false })
  iconUrl?: string;
}
