import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'CS101' })
  readonly code?: string;

  @ApiPropertyOptional({ example: 'Introduction to Computer Science' })
  readonly title?: string;

  @ApiPropertyOptional({ example: { solid: '#FFFFFF', accent: '#000000' } })
  readonly color?: {
    solid: string;
    accent: string;
  };

  @ApiPropertyOptional({ example: 'image-url' })
  readonly iconUrl?: string;
}
