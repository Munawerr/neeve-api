import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { CoursesModule } from './courses/courses.module';
import { PackagesModule } from './packages/packages.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TopicsModule } from './topics/topics.module';
import { FilesModule } from './files/files.module';
import { TestsModule } from './tests/tests.module';
import { QuestionsModule } from './questions/questions.module';
import { ResultsModule } from './results/results.module';
import { QuestionResultsModule } from './question-results/question-results.module';
import { LiveClassesModule } from './liveClasses/liveClasses.module';
import { ThreadsModule } from './threads/threads.module';
import { DiscussionsModule } from './discussions/discussions.module';
import * as cookieParser from 'cookie-parser';
import { SsoModule } from './sso/sso.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // Enable CORS
  app.use(cookieParser()); // Use cookie-parser middleware

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
      TopicsModule,
      FilesModule,
      TestsModule,
      QuestionsModule,
      ResultsModule,
      QuestionResultsModule,
      LiveClassesModule,
      ThreadsModule,
      DiscussionsModule,
      SsoModule,
    ],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
