import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
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
import { FtModule } from './ft/ft.module.js';
import { LegalModule } from './legal/legal.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'uploads'),
        serveRoot: '/uploads',
      },
      // Landing de frikidex.com: sirve api/public/ en la raíz. express.static
      // solo responde a GET/HEAD y solo si el archivo existe, así que no
      // interfiere con las rutas de la API (POST /auth/register, GET /ft/*, etc.).
      {
        rootPath: join(process.cwd(), 'public'),
        serveRoot: '/',
      },
    ),
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
    FtModule,
    LegalModule,
    WaitlistModule,
  ],
})
export class AppModule {}
