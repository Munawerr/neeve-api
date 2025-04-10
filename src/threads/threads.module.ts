import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { Thread, ThreadSchema } from './schemas/thread.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Topic, TopicSchema } from 'src/topics/schemas/topic.schema';
import { Class, ClassSchema } from 'src/classes/schemas/class.schema';
import { UsersService } from 'src/users/users.service';
import { ClassesService } from 'src/classes/classes.service';
import { Role, RoleSchema } from 'src/roles/schemas/role.schema';
import { Result, ResultSchema } from 'src/results/schemas/result.schema';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { S3Service } from 'src/s3/s3.service';
import {
  LoginHistory,
  LoginHistorySchema,
} from 'src/auth/schemas/login-history.schema';
import { LoginHistoryService } from 'src/auth/login-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Thread.name, schema: ThreadSchema },
      { name: User.name, schema: UserSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Result.name, schema: ResultSchema },
      { name: Package.name, schema: PackageSchema },
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
  ],
  controllers: [ThreadsController],
  providers: [
    ThreadsService,
    UsersService,
    ClassesService,
    S3Service,
    LoginHistoryService,
  ],
})
export class ThreadsModule {}
