import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';

export class CreateLoginHistoryDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  userId: MongooseSchema.Types.ObjectId | String;

  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent information' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Login timestamp' })
  @IsOptional()
  @IsDate()
  loginTime?: Date;

  @ApiPropertyOptional({ description: 'Location information' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({ description: 'Login success status' })
  @IsOptional()
  @IsBoolean()
  success?: boolean;
}
