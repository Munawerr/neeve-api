import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'NewPassword@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}