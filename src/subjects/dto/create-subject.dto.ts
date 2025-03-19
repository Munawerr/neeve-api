import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'CS101' })
  readonly code: string;

  @ApiProperty({ example: 'Introduction to Computer Science' })
  readonly title: string;

  @ApiProperty({ example: { solid: '#FFFFFF', accent: '#000000' } })
  readonly color: {
    solid: string;
    accent: string;
  };

  @ApiProperty({ example: 'https://pngs.flaticons.com/asdf.png' })
  readonly iconUrl: string;
}
