import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './schemas/course.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Result, ResultSchema } from '../results/schemas/result.schema';
import { Test, TestSchema } from '../tests/schemas/test.schema';
import { S3Service } from 'src/s3/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Test.name, schema: TestSchema },
      { name: User.name, schema: UserSchema },
      { name: Result.name, schema: ResultSchema },
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService, S3Service],
  exports: [CoursesService, S3Service],
})
export class CoursesModule {}
