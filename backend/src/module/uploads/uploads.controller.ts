
import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UploadsService } from './uploads.service.js';
import { UserRoleId } from '../../common/decorators/roles.decorator.js';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    roleId: number;
  };
};

@Controller('api/v1/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const ticketId = (
      req.body as Record<string, unknown>
    )?.ticketId;

    if (typeof ticketId !== 'string') {
      throw new BadRequestException(
        'ticketId is required in multipart form data',
      );
    }

    return this.uploadsService.uploadAttachment(
      file as Express.Multer.File,
      ticketId,
      req.user.id,
      req.user.roleId === UserRoleId.ADMIN ? 'ADMIN' : 'USER',
    );
  }
}
