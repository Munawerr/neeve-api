import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { CoursesModule } from './courses/courses.module';
import { PackagesModule } from './packages/packages.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ChaptersModule } from './chapters/chapters.module';
import { SubChaptersModule } from './subChapters/subChapters.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // Enable CORS

  const config = new DocumentBuilder()
    .setTitle('Neeve API')
    .setDescription('The Neeve API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    include: [
      AppModule,
      ClassesModule,
      CoursesModule,
      PackagesModule,
      SubjectsModule,
      UsersModule,
      ChaptersModule,
      SubChaptersModule,
    ],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
