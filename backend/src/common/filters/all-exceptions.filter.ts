import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: string;
}

/**
 * Converts every error into one predictable JSON shape so the mobile app (and later the web admin)
 * can always show `message` to the user.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const body = this.buildBody(exception, request.url);
    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    }
    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown, path: string): ErrorResponseBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let message = exception.message;
      let details: string[] | undefined;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseMessage = (exceptionResponse as { message?: string | string[] }).message;
        if (Array.isArray(responseMessage)) {
          details = responseMessage;
          message = responseMessage[0] ?? message;
        } else if (typeof responseMessage === 'string') {
          message = responseMessage;
        }
      }
      return { statusCode, error: HttpStatus[statusCode] ?? 'Error', message, details, path, timestamp };
    }

    if (exception instanceof QueryFailedError) {
      const driverCode = (exception.driverError as { code?: string } | undefined)?.code;
      if (driverCode === 'ER_DUP_ENTRY') {
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'This record already exists.',
          path,
          timestamp,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Something went wrong on our side. Please try again.',
      path,
      timestamp,
    };
  }
}
