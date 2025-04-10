import {
  IsString,
  IsPhoneNumber,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentUserDto {
  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({ example: '+91312345789', required: false })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '2000-01-01', description: 'Date of birth in ISO format (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiPropertyOptional({ example: 'REG123456' })
  @IsString()
  @IsOptional()
  regNo?: string;

  @ApiProperty({ example: ['package1', 'package2'] })
  readonly packages: string[];
}
