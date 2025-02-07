import { ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateSubChapterDto {
  @ApiPropertyOptional({ example: 'SC101' })
  readonly code?: string;

  @ApiPropertyOptional({ example: 'Introduction to Organic Chemistry' })
  readonly title?: string;

  @ApiPropertyOptional({ example: '60d0fe4f5311236168a109cc' })
  readonly chapter?: Types.ObjectId;

  @ApiPropertyOptional({ example: ['https://example.com/intro1', 'https://example.com/intro2'] })
  readonly introVideoUrls?: string[];

  @ApiPropertyOptional({ example: ['https://example.com/note1', 'https://example.com/note2'] })
  readonly studyNotesUrls?: string[];

  @ApiPropertyOptional({ example: ['https://example.com/plan1', 'https://example.com/plan2'] })
  readonly studyPlansUrls?: string[];

  @ApiPropertyOptional({ example: ['https://example.com/problem1', 'https://example.com/problem2'] })
  readonly practiceProblemsUrls?: string[];
}
