import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser = require('cookie-parser');
import type { Request, Response } from 'express';

const CORS_ORIGINS = [
  'https://lakshya.neeve.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

let cachedHttpHandler:
  | ((req: Request, res: Response) => void | Promise<void>)
  | null = null;

function applyCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin || '';
  if (CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, Origin, X-Requested-With',
    );
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  await app.init();
  return app;
}

export default async function handler(req: Request, res: Response) {
  if (applyCors(req, res)) return;

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
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: CORS_ORIGINS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application listening on port ${process.env.PORT ?? 3000}`);
}

if (process.env.VERCEL !== '1') {
  bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
