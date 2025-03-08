import { ApiProperty } from '@nestjs/swagger';

// DTO class for Report Card
export class ReportCardDto {
  // Test type of the report card
  @ApiProperty({ example: 'test' })
  testType: string;

  // Subject of the report card
  @ApiProperty({ example: '60d0fe4f5311236168a109ca' })
  readonly subject: string;
}

// DTO class for Report Card
export class CombinedReportCardDto {
  // Test type of the report card
  @ApiProperty({ example: 'test' })
  testType: string;
}
