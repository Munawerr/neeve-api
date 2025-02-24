import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveClassesController } from './liveClasses.controller';
import { LiveClassesService } from './liveClasses.service';
import { LiveClass, LiveClassSchema } from './schemas/liveClass.schema';
import { Package, PackageSchema } from '../packages/schemas/package.schema';
import { Subject, SubjectSchema } from '../subjects/schemas/subject.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiveClass.name, schema: LiveClassSchema },
      { name: Package.name, schema: PackageSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LiveClassesController],
  providers: [LiveClassesService],
})
export class LiveClassesModule {}
