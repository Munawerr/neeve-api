import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { Class, ClassSchema } from './schemas/class.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Class.name, schema: ClassSchema }])],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
