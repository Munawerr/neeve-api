export class ForgotPasswordDto {
  email: string;
}

export class VerifyOtpDto {
  email: string;
  otp: string;
  token: string;
}

export class ResendOtpDto {
  email: string;
}

export class ResetPasswordDto {
  email: string;
  newPassword: string;
  token: string;
}
