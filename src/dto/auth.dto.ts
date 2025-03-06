import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  readonly email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '1234' })
  readonly otp: string;

  @ApiProperty({ example: 'some-uuid-token' })
  readonly token: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  readonly email: string;

  @ApiProperty({ example: 'some-uuid-token' })
  readonly token: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user-id' })
  readonly userId: string;

  @ApiProperty({ example: 'newPassword123' })
  readonly newPassword: string;

  @ApiProperty({ example: 'some-uuid-token' })
  readonly token: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class LoginStep1Dto {
  @IsString()
  @IsNotEmpty()
  loginData: string;

  @IsString()
  @IsNotEmpty()
  loginType: 'student' | 'institute' | 'admin';
}

export class LoginStep2Dto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
