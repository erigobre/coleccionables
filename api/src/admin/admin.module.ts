import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FtModule } from '../ft/ft.module.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AdminBootstrapController } from './admin-bootstrap.controller.js';

@Module({
  imports: [PrismaModule, FtModule],
  controllers: [AdminController, AdminBootstrapController],
  providers: [AdminService],
})
export class AdminModule {}
