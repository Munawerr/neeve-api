import { IsString, IsNotEmpty } from 'class-validator';

// DTO class for Report Card
export class ReportCardDto {
  // Test type of the report card
  @IsString()
  @IsNotEmpty()
  testType: string;

  // Subject of the report card
  @IsString()
  @IsNotEmpty()
  subject: string;
}
