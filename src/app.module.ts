import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { CatalogModule } from '@/catalog/catalog.module';
import { RolesGuard } from '@/common/guards/roles.guard';
import adminConfig from '@/configs/admin.config';
import agentConfig from '@/configs/agent.config';
import configuration from '@/configs/configuration';
import dbConfig from '@/configs/database.config';
import { ConversationsModule } from '@/conversations/conversations.module';
import { MetricsModule } from '@/metrics/metrics.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UsersModule } from '@/users/users.module';
// import redisConfig from '@/configs/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      load: [
        configuration,
        dbConfig,
        adminConfig,
        agentConfig,
        // redisConfig,
      ],
      cache: true,
    }),
    UsersModule,
    AuthModule,
    PrismaModule,
    CatalogModule,
    MetricsModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
