import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser = require('cookie-parser');
import type { Request, Response } from 'express';

let cachedHttpHandler: ((req: Request, res: Response) => void | Promise<void>) | null = null;

async function createApp() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use(cookieParser());

  await app.init();
  return app;
}

export default async function handler(req: Request, res: Response) {
  if (!cachedHttpHandler) {
    const app = await createApp();
    cachedHttpHandler = app.getHttpAdapter().getInstance();
  }

  const httpHandler = cachedHttpHandler;
  if (!httpHandler) {
    throw new Error('HTTP handler not initialized');
  }

  return httpHandler(req, res);
}

async function bootstrap() {
  const app = await createApp();

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application listening on port ${process.env.PORT ?? 3000}`);
}

if (process.env.VERCEL !== '1') {
  bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
