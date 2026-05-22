import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class MulterErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const message =
      exception instanceof Error ? exception.message : 'Unknown error';

    console.error('[MulterErrorFilter] Caught:', message);
    if (exception instanceof Error && exception.stack) {
      console.error('[MulterErrorFilter] Stack:', exception.stack);
    }

    const isAbort = message?.toLowerCase().includes('aborted');
    const isMulter =
      message?.toLowerCase().includes('multer') ||
      message?.toLowerCase().includes('file too large') ||
      message?.toLowerCase().includes('unexpected field');

    response.status(isAbort ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: isAbort ? 'REQUEST_ABORTED' : 'UPLOAD_ERROR',
      message: isAbort
        ? 'La conexión se interrumpió durante la subida del archivo. Verifica el tamaño y la conexión de red.'
        : isMulter
          ? 'Error al procesar los archivos subidos. Verifica los campos y tamaños.'
          : message,
    });
  }
}
