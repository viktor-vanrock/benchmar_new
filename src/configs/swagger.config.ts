import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Benchmark Catalog')
  .setDescription('Benchmark Catalog API')
  .setVersion('1.0')
  .build();
