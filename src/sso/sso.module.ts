import { Module } from '@nestjs/common';
import { SsoClientController } from './sso-client.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [SsoClientController],
})
export class SsoModule {}
