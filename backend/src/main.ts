import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const { AppModule, ObserveEnabled, ObserveInstrument } = await import(
    './app.module.js'
  );
  const app = await NestFactory.create(
    AppModule,
    ObserveEnabled ? { instrument: ObserveInstrument } : undefined,
  );

  // Request body validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
