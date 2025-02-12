import { ApiProperty } from '@nestjs/swagger';

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
