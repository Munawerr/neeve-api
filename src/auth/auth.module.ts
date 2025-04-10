import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LoginHistory,
  LoginHistorySchema,
} from './schemas/login-history.schema';
import { LoginHistoryService } from './login-history.service';
import { LoginHistoryModule } from './login-history.module';
import { MailService } from 'src/mail/mail.service';
import { SmsService } from 'src/sms/sms.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
    LoginHistoryModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LoginHistoryService,
    MailService,
    SmsService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
