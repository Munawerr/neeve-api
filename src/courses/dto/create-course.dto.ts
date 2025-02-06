import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'CRS001' })
  readonly code: string;

  @ApiProperty({ example: 'Introduction to Math' })
  readonly title: string;

  @ApiProperty({ example: { solid: '#000000', accent: '#FFFFFF' } })
  readonly color: {
    solid: string;
    accent: string;
  };

  @ApiProperty({ example: 'http://example.com/icon.png' })
  iconUrl: string;
}
