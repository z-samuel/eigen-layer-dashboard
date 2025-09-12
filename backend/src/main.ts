import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MaterializedViewService } from './materialized-view.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
  });

  // Initialize materialized view service
  const materializedViewService = app.get(MaterializedViewService);
  await materializedViewService.initialize();

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Backend server running on http://localhost:${port}`);
  console.log(`🔍 GraphQL Playground available at http://localhost:${port}/graphql`);
  console.log(`📊 Materialized view initialized and scheduled for refresh every minute`);
}

bootstrap();
