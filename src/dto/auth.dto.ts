import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '1234' })
  otp: string;

  @ApiProperty({ example: 'some-uuid-token' })
  token: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'some-uuid-token' })
  token: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user-id' })
  userId: string;

  @ApiProperty({ example: 'newPassword123' })
  newPassword: string;

  @ApiProperty({ example: 'some-uuid-token' })
  token: string;
}
