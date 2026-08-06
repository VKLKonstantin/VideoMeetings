import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * NestJS's FileInterceptor maps multer's LIMIT_FILE_SIZE error to a 413
 * (PayloadTooLargeException). The plan requires oversized uploads to be
 * rejected with 400, same as any other validation failure, so this
 * normalizes the status code without giving up multer's cheap early abort.
 */
@Catch(PayloadTooLargeException)
export class RecordingTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Файл превышает максимально допустимый размер',
      error: 'Bad Request',
    });
  }
}
