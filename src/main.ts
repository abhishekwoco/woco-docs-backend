import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './uploads/uploads.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Local file storage ──────────────────────────────────────────────────
  // Uploaded images (and any other static assets) live on the host disk and
  // are served at /uploads/*. The deployment is on an internal local machine,
  // so using its own storage is intentional. Path is configurable via
  // UPLOADS_DIR; defaults to <cwd>/uploads.
  mkdirSync(join(UPLOADS_DIR, 'images'), { recursive: true });
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  // Enable global validation.
  //
  // `whitelist: true` strips any body property not declared in the DTO —
  // unknown fields are silently dropped rather than rejected.
  //
  // We deliberately do NOT set `forbidNonWhitelisted: true`: with it, an
  // older backend build hard-400s the moment a newer frontend sends a field
  // the old DTO doesn't know yet (this broke prod /chat/send when the
  // frontend started sending `service` before the backend was rebuilt).
  // Stripping instead of rejecting makes deploys order-tolerant: an old
  // backend ignores new fields, a new backend accepts old clients because
  // added DTO fields are @IsOptional(). Declared fields are still fully
  // validated — this only changes the handling of UNKNOWN fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONT_URL,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  // await app.listen(3000, '10.10.26.130'); // use this only when hosting on local network

  console.log(`Application is running on port: ${process.env.PORT}`);
}
bootstrap();
