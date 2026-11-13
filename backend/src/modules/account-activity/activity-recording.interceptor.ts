import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { concatMap, Observable } from 'rxjs';
import { AuthenticatedRequest } from '../../common/decorators/auth.decorators';
import { normalizeIpAddress } from '../../common/utils/request.util';
import { AccountActivityService } from './account-activity.service';
import { RECORD_ACTIVITY_KEY, RecordActivityOptions } from './record-activity.decorator';

/**
 * Global interceptor behind @RecordActivity(): when the route handler succeeds, it saves one line in
 * the signed-in user's activity log (who, what, which device, which IP). Failed requests record nothing.
 */
@Injectable()
export class ActivityRecordingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityRecordingInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accountActivityService: AccountActivityService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const activityOptions = this.reflector.get<RecordActivityOptions | undefined>(
      RECORD_ACTIVITY_KEY,
      context.getHandler(),
    );
    if (!activityOptions) return next.handle();

    return next.handle().pipe(
      concatMap(async (result: unknown) => {
        await this.recordActivity(context, activityOptions, result);
        return result;
      }),
    );
  }

  private async recordActivity(
    context: ExecutionContext,
    activityOptions: RecordActivityOptions,
    result: unknown,
  ): Promise<void> {
    try {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const user = request.user;
      if (!user) return;

      await this.accountActivityService.record({
        userAccountId: user.userAccountId,
        waterStationId: user.waterStationId,
        userSessionId: user.userSessionId,
        type: activityOptions.type,
        description: activityOptions.describe({
          result,
          body: request.body as unknown,
          params: request.params as Record<string, string>,
          user,
        }),
        deviceName: user.deviceName,
        ipAddress: normalizeIpAddress(request.ip),
      });
    } catch (error) {
      // The action itself succeeded; a broken description must not turn it into an error.
      this.logger.warn(
        `Could not describe activity ${activityOptions.type}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
