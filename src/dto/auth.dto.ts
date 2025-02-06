export class ForgotPasswordDto {
  email: string;
}

export class VerifyOtpDto {
  otp: string;
  token: string;
}

export class ResendOtpDto {
  email: string;
  token: string;
}

export class ResetPasswordDto {
  userId: string;
  newPassword: string;
  token: string;
}
