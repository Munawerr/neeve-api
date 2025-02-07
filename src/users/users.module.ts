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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: Package.name, schema: PackageSchema }]),
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
  ],
  providers: [UsersService, S3Service, PackagesService, CoursesService],
  exports: [UsersService, S3Service, PackagesService, CoursesService],
  controllers: [UsersController],
})
export class UsersModule {}
