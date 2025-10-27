import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'src', 'public'));
  app.use(express.json()); // Ensure req.body is populated

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[API] ${req.method} ${req.url} - body:`, req.body);
    next();
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
