import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Role, RoleSchema } from './roles/schemas/role.schema';
import { User, UserSchema } from './users/schemas/user.schema'; // Import User schema
import * as env from 'dotenv';
import { Course, CourseSchema } from './courses/schemas/course.schema';
import { Class, ClassSchema } from './classes/schemas/class.schema';
import { Subject, SubjectSchema } from './subjects/schemas/subject.schema';
import { Package, PackageSchema } from './packages/schemas/package.schema';
import { SubjectsModule } from './subjects/subjects.module';
import { CoursesModule } from './courses/courses.module';
import { ClassesModule } from './classes/classes.module';
import { PackagesModule } from './packages/packages.module';
env.config();

const DB_URL: string = String(process.env.DB_URL);
const JWT_SECRET: string = String(process.env.JWT_SECRET);
const JWT_EXPIRES_IN: string = String(process.env.JWT_EXPIRES_IN);

@Module({
  imports: [
    MongooseModule.forRoot(DB_URL),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Package.name, schema: PackageSchema },
    ]), // Add schema
    UsersModule,
    AuthModule,
    SubjectsModule,
    CoursesModule,
    ClassesModule,
    PackagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuthService],
})
export class AppModule {}
