import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'CS101' })
  readonly code?: string;

  @ApiPropertyOptional({ example: 'Introduction to Computer Science' })
  readonly title?: string;
}
