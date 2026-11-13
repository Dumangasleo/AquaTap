// All dates are handled in Philippine time (MySQL DATETIME values are stored in Manila time).
process.env.TZ = 'Asia/Manila';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // The API sits behind a local proxy (the cloudflared tunnel, later a reverse proxy on the same server):
  // trust it so request.ip is the phone's real address, shown in Profile > Devices and the activity log.
  app.set('trust proxy', 'loopback');

  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.use(helmet());
  // Signatures, QR codes and KYB document photos are sent as text (SVG / data URI).
  app.useBodyParser('json', { limit: '8mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AquaTap API')
    .setDescription('Water refilling station management API (mobile app now, web admin later).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 so phones on the same Wi-Fi can reach the API.
  await app.listen(port, '0.0.0.0');
  Logger.log(`AquaTap API running on http://localhost:${port}/api/v1 (docs: /api/docs)`, 'Bootstrap');
}

void bootstrap();
