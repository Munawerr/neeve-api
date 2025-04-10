import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscussionsController } from './discussions.controller';
import { DiscussionsService } from './discussions.service';
import { Discussion, DiscussionSchema } from './schemas/discussion.schema';
import { Thread, ThreadSchema } from 'src/threads/schemas/thread.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Discussion.name, schema: DiscussionSchema },
      { name: Thread.name, schema: ThreadSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
