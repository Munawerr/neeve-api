import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackagesController } from './packages.controller';

import { Package, PackageSchema } from './schemas/package.schema';
import { Course, CourseSchema } from 'src/courses/schemas/course.schema';
import { Class, ClassSchema } from 'src/classes/schemas/class.schema';
import { Subject, SubjectSchema } from 'src/subjects/schemas/subject.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Role, RoleSchema } from 'src/roles/schemas/role.schema';

import { PackagesService } from './packages.service';
import { CoursesService } from '../courses/courses.service';
import { ClassesService } from '../classes/classes.service';
import { SubjectsService } from '../subjects/subjects.service';
import { UsersService } from 'src/users/users.service';
import { S3Service } from 'src/s3/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Package.name, schema: PackageSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [PackagesController],
  providers: [
    PackagesService,
    CoursesService,
    ClassesService,
    SubjectsService,
    UsersService,
    S3Service,
  ],
})
export class PackagesModule {}
