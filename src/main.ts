import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONT_URL,
    credentials: true,
  });

  // await app.listen(process.env.PORT ?? 3000);
  await app.listen(3000, '10.10.26.130'); // use this only when hosting on local network

  console.log(`Application is running on port: ${process.env.PORT}`);
}
bootstrap();
