import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'CS101' })
  readonly code: string;

  @ApiProperty({ example: 'Introduction to Computer Science' })
  readonly title: string;
}
