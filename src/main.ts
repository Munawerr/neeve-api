import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());
  app.enableCors(); // Enable CORS
  app.use(cookieParser()); // Use cookie-parser middleware

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
