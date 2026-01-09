import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BuildingsController } from '../src/buildings/buildings.controller';
import { BuildingsService } from '../src/buildings/buildings.service';
import { AdminGuard } from '../src/common/guards/admin.guard';
import { SwaggerModule as AppSwaggerModule } from '../src/swagger/swagger.module';

async function generateOpenAPI() {
  try {
    process.env.SKIP_DB_CONNECTION = 'true';
    process.env.GENERATE_OPENAPI = 'true';
    process.env.NODE_ENV = 'production';
    
    console.log('DEBUG: Creating testing module...');

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
        }),
        AppSwaggerModule,
      ],
      controllers: [BuildingsController],
      providers: [
        {
          provide: BuildingsService,
          useValue: {
            findAll: () => {},
            findOne: () => {},
            create: () => {},
            update: () => {},
            remove: () => {},
          },
        },
        AdminGuard
      ],
    })
      .compile();
    
    const app = moduleRef.createNestApplication();
    
    console.log('DEBUG: App created');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    
    console.log('DEBUG: Global pipes applied');

    // Initialize app
    console.log('DEBUG: Initializing app...');
    await app.init();
    console.log('DEBUG: App initialized successfully');
    
    const config = new DocumentBuilder()
      .setTitle('Listings Service API')
      .setDescription('API for managing building listings')
      .setVersion('1.0')
      .addTag('buildings')
      .build();
    
    let document;
    try {
      document = SwaggerModule.createDocument(app, config);
    } catch (swaggerError: any) {
      console.error('❌ Error: Unable to generate Swagger document.');
      throw swaggerError;
    }
    
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    
    console.log(`✅ OpenAPI spec generated: ${outputPath}`);
    
    await app.close();
    process.exit(0);
  } catch (error: any) {
      console.error('❌ Error generating OpenAPI spec:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
      }
      process.exit(1);
  }
}

generateOpenAPI();
