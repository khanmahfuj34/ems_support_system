
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as https from 'node:https';
import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

type CloudinaryResponseDetails = {
  statusCode?: number;
  statusMessage?: string;
  requestId?: string;
  providerMessage?: string;
  responseBytes?: number;
};

class CloudinaryResponseCapture {
  readonly details: CloudinaryResponseDetails = {};
  private completeResponse!: () => void;
  private readonly responseComplete = new Promise<void>((resolve) => {
    this.completeResponse = resolve;
  });
  private responseStarted = false;

  capture(response: IncomingMessage) {
    this.responseStarted = true;
    this.details.statusCode = response.statusCode;
    this.details.statusMessage = response.statusMessage;

    for (const headerName of [
      'x-cloudinary-request-id',
      'x-cld-request-id',
      'x-request-id',
      'x-correlation-id',
      'cf-ray',
    ]) {
      const header = response.headers[headerName];
      const value = Array.isArray(header) ? header[0] : header;
      if (typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) {
        this.details.requestId = value;
        break;
      }
    }

    const errorHeader = response.headers['x-cld-error'];
    const headerMessage = Array.isArray(errorHeader) ? errorHeader[0] : errorHeader;
    const chunks: Buffer[] = [];
    let capturedBytes = 0;

    response.on('data', (chunk: Buffer | string) => {
      if (capturedBytes >= 8192) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = 8192 - capturedBytes;
      chunks.push(bytes.subarray(0, remaining));
      capturedBytes += Math.min(bytes.length, remaining);
      this.details.responseBytes = capturedBytes;
    });

    response.once('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      try {
        const body = JSON.parse(rawBody) as {
          error?: { message?: unknown } | string;
          message?: unknown;
        };
        const nestedMessage = typeof body.error === 'object' && body.error !== null
          ? body.error.message
          : body.error;
        const message = nestedMessage ?? body.message;
        if (typeof message === 'string') {
          const requestMatch = message.match(/^\[([A-Za-z0-9_.:-]{1,128})\]\s*/);
          if (requestMatch) {
            this.details.requestId ??= requestMatch[1];
            this.details.providerMessage = message.slice(requestMatch[0].length).trim();
          } else {
            this.details.providerMessage = message;
          }
        }
      } catch {
        if (typeof headerMessage === 'string') {
          this.details.providerMessage = headerMessage;
        }
      }
      this.details.providerMessage ??= this.details.statusMessage;
      this.completeResponse();
    });
    response.once('error', () => {
      this.details.providerMessage ??= this.details.statusMessage;
      this.completeResponse();
    });
    response.once('close', () => {
      this.details.providerMessage ??= this.details.statusMessage;
      this.completeResponse();
    });
  }

  async waitForResponse() {
    if (!this.responseStarted) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      this.responseComplete,
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 1000);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
  }
}

function createCloudinaryDiagnosticAgent(captureResponse: CloudinaryResponseCapture) {
  const agent = new https.Agent({ keepAlive: false });
  const internalAgent = agent as https.Agent & {
    addRequest: (request: ClientRequest, options: RequestOptions) => void;
  };
  const originalAddRequest = internalAgent.addRequest.bind(agent);

  // Cloudinary's SDK drops response bodies for unexpected HTTP statuses. Tap
  // this upload's request response while leaving the SDK's transport intact.
  internalAgent.addRequest = (request, options) => {
    // Run before Cloudinary's response callback; it can reject immediately on
    // 403 before our upload callback starts waiting for the response details.
    request.prependOnceListener('response', (response) => captureResponse.capture(response));
    originalAddRequest(request, options);
  };

  return agent;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getCloudinary() {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.config.getOrThrow<string>(
        'CLOUDINARY_API_KEY',
      ),
      api_secret: this.config.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
      secure: true,
    });

    return cloudinary;
  }

  private logUploadError(stage: 'cloudinary' | 'database' | 'cleanup', error: unknown, ticketId: bigint) {
    const cause = error instanceof Error ? error : undefined;
    const details = typeof error === 'object' && error !== null
      ? error as Record<string, unknown>
      : {};
    const nested = typeof details.error === 'object' && details.error !== null
      ? details.error as Record<string, unknown>
      : {};
    const nestedCause = typeof details.cause === 'object' && details.cause !== null
      ? details.cause as Record<string, unknown>
      : {};
    const response = typeof details.response === 'object' && details.response !== null
      ? details.response as CloudinaryResponseDetails
      : {};
    const code = details.code ?? details.http_code ?? details.statusCode ?? nested.code ?? nested.http_code ?? nestedCause.code;
    const safeCode = typeof code === 'string' || typeof code === 'number' ? String(code) : 'unknown';
    const underlyingMessage = [
      details.providerMessage,
      response.providerMessage,
      details.message,
      nested.message,
      nestedCause.message,
      typeof details.error === 'string' ? details.error : undefined,
      cause?.message,
    ].find(
      (message): message is string =>
        typeof message === 'string' && message.trim().length > 0,
    );
    let safeMessage = underlyingMessage
      ?? `No upstream message was provided (error code=${safeCode})`;
    safeMessage = safeMessage
      .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/(cloudinary:\/\/)[^@\s]+@/gi, '$1[redacted]@')
      .replace(/((?:mysql|mariadb):\/\/)[^@\s]+@/gi, '$1[redacted]@')
      .replace(/([?&](?:api_key|api_secret|token|signature)=)[^&\s]+/gi, '$1[redacted]')
      .replace(/\b(api_key|api_secret|password|passwd|token)\s*[:=]\s*('[^']*'|"[^"]*"|[^,\s;]+)/gi, '$1=[redacted]');

    for (const secret of [
      this.config.get<string>('CLOUDINARY_API_KEY'),
      this.config.get<string>('CLOUDINARY_API_SECRET'),
      this.config.get<string>('CLOUDINARY_URL'),
      this.config.get<string>('DATABASE_URL'),
      this.config.get<string>('JWT_SECRET'),
    ]) {
      if (secret) safeMessage = safeMessage.split(secret).join('[redacted]');
    }

    const status =
      details.http_code ??
      details.statusCode ??
      nested.http_code ??
      nested.statusCode ??
      response.statusCode;
    const requestId =
      details.requestId ??
      details.request_id ??
      nested.requestId ??
      nested.request_id ??
      response.requestId;
    this.logger.error(
      `Attachment ${stage} failed ticketId=${ticketId} code=${safeCode} httpStatus=${typeof status === 'number' ? status : 'unknown'} requestId=${typeof requestId === 'string' ? requestId : 'unavailable'} responseBytes=${typeof response.responseBytes === 'number' ? response.responseBytes : 'unknown'} message=${safeMessage}`,
    );
  }

  private async uploadBuffer(
    buffer: Buffer,
    resourceType: 'image' | 'raw',
  ): Promise<UploadApiResponse> {
    const client = this.getCloudinary();
    const responseCapture = new CloudinaryResponseCapture();
    const agent = createCloudinaryDiagnosticAgent(responseCapture);

    return new Promise((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        {
          folder: 'supportdesk/attachments',
          resource_type: resourceType,
          type: 'authenticated',
          agent,
        },
        (error, result) => {
          if (error || !result) {
            void responseCapture.waitForResponse().then(() => {
              const originalError = typeof error === 'object' && error !== null
                ? error as Record<string, unknown>
                : {};
              const enrichedError = {
                ...originalError,
                message: responseCapture.details.providerMessage
                  ?? originalError.message
                  ?? 'Cloudinary upload failed',
                http_code: responseCapture.details.statusCode
                  ?? originalError.http_code,
                requestId: responseCapture.details.requestId,
                response: responseCapture.details,
              };
              agent.destroy();
              reject(enrichedError);
            });
            return;
          }

          agent.destroy();
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  async uploadAttachment(
    file: UploadedFile,
    ticketIdInput: string,
    uploaderId: string | number,
    role: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPG, PNG, WEBP and PDF files are allowed',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Maximum file size is 5 MB');
    }

    if (
      !/^[1-9]\d*$/.test(ticketIdInput) ||
      !/^[1-9]\d*$/.test(String(uploaderId))
    ) {
      throw new BadRequestException('Invalid ticket or user ID');
    }

    const ticketId = BigInt(ticketIdInput);
    const userId = BigInt(uploaderId);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (
      role !== 'ADMIN' &&
      ticket.userId !== userId
    ) {
      throw new ForbiddenException(
        'You cannot attach files to this ticket',
      );
    }

    // Never trust the client MIME type alone.
    // Production deployments should also inspect file signatures.
    const resourceType =
      file.mimetype === 'application/pdf' ? 'raw' : 'image';

    let uploaded: UploadApiResponse;

    try {
      uploaded = await this.uploadBuffer(file.buffer, resourceType);
    } catch (error) {
      this.logUploadError('cloudinary', error, ticketId);
      throw new ServiceUnavailableException(
        'File upload failed. Please try again.',
      );
    }

    try {
      const attachment =
        await this.prisma.ticketAttachment.create({
          data: {
            ticketId,
            uploadedBy: userId,
            fileName: file.originalname,
            fileUrl: uploaded.secure_url,
            cloudinaryPublicId: uploaded.public_id,
            mimeType: file.mimetype,
            fileSize: BigInt(file.size),
            resourceType: uploaded.resource_type,
          },
        });

      return {
        success: true,
        data: {
          id: attachment.id.toString(),
          ticketId: attachment.ticketId.toString(),
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize.toString(),
        },
      };
    } catch (error) {
      this.logUploadError('database', error, ticketId);
      // Avoid leaving an orphaned file if the DB write fails.
      try {
        await this.getCloudinary().uploader.destroy(
          uploaded.public_id,
          {
            resource_type: uploaded.resource_type as 'image' | 'raw',
            type: 'authenticated',
          },
        );
      } catch (cleanupError) {
        this.logUploadError('cleanup', cleanupError, ticketId);
      }

      throw new ServiceUnavailableException(
        'Attachment metadata could not be saved',
      );
    }
  }
}
