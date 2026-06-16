import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Chapter 1 Assignment' })
  title: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  subject: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109cb' })
  package: Types.ObjectId;

  @ApiProperty({ example: '60d0fe4f5311236168a109cc' })
  institute: Types.ObjectId;

  @ApiProperty({
    example: [
      'https://example.com/assignment1.pdf',
      'https://example.com/assignment2.docx',
    ],
    description: 'Array of file URLs (PDF, DOCX, XLSX, etc.)',
  })
  fileUrls: string[];
}
