import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from './../roles/schemas/role.schema';
import { S3Service } from '../s3/s3.service';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { Course, CourseSchema } from 'src/courses/schemas/course.schema';
import { PackagesService } from 'src/packages/packages.service';
import { CoursesService } from 'src/courses/courses.service';
import { Result, ResultSchema } from 'src/results/schemas/result.schema';
import {
  QuestionResult,
  QuestionResultSchema,
} from 'src/question-results/schemas/question-result.schema';
import {
  LoginHistory,
  LoginHistorySchema,
} from 'src/auth/schemas/login-history.schema';
import { LoginHistoryService } from 'src/auth/login-history.service';
import { Test, TestSchema } from 'src/tests/schemas/test.schema';
import { TestsService } from 'src/tests/tests.service';
import {
  Question,
  QuestionSchema,
} from 'src/questions/schemas/question.schema';
import { QuestionsService } from 'src/questions/questions.service';
import { Topic, TopicSchema } from 'src/topics/schemas/topic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: Package.name, schema: PackageSchema }]),
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    MongooseModule.forFeature([{ name: Test.name, schema: TestSchema }]),
    MongooseModule.forFeature([{ name: Result.name, schema: ResultSchema }]),
    MongooseModule.forFeature([{ name: Topic.name, schema: TopicSchema }]),
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
    MongooseModule.forFeature([
      { name: QuestionResult.name, schema: QuestionResultSchema },
    ]),
    MongooseModule.forFeature([
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
  ],
  providers: [
    UsersService,
    S3Service,
    PackagesService,
    CoursesService,
    LoginHistoryService,
    TestsService,
    QuestionsService,
  ],
  exports: [
    UsersService,
    S3Service,
    PackagesService,
    CoursesService,
    LoginHistoryService,
    TestsService,
    QuestionsService,
  ],
  controllers: [UsersController],
})
export class UsersModule {}
