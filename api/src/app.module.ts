import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { SeasonsModule } from './seasons/seasons.module.js';
import { CollectionsModule } from './collections/collections.module.js';
import { TagsModule } from './tags/tags.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AiModule } from './ai/ai.module.js';
import { ItemsModule } from './items/items.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { WishlistModule } from './wishlist/wishlist.module.js';
import { ShareModule } from './share/share.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    SeasonsModule,
    CollectionsModule,
    TagsModule,
    StorageModule,
    AiModule,
    ItemsModule,
    TransfersModule,
    WishlistModule,
    ShareModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
