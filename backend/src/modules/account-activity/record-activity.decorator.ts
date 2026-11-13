import { SetMetadata } from '@nestjs/common';
import { ActivityType } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

export const RECORD_ACTIVITY_KEY = 'recordActivity';

/** What a route handler knows when its action succeeded. */
export interface ActivityContext<TResult = unknown, TBody = unknown> {
  /** Value returned by the route handler. */
  result: TResult;
  body: TBody;
  params: Record<string, string>;
  user: AuthenticatedUser;
}

export interface RecordActivityOptions<TResult = unknown, TBody = unknown> {
  type: ActivityType;
  /**
   * Builds the sentence shown to the user. Use plain words a customer understands,
   * e.g. "Placed order AQ261110-AB12 for 3 gallons".
   */
  describe: (context: ActivityContext<TResult, TBody>) => string;
}

/**
 * Adds a line to the user's activity log AFTER the route succeeds (see ActivityRecordingInterceptor).
 * The category comes from ACTIVITY_CATEGORY_BY_TYPE, so a type always lands in the same group.
 *
 *   @RecordActivity<CustomerOrderResponse>({
 *     type: ActivityType.OrderPlaced,
 *     describe: ({ result }) => `Placed order ${result.orderNumber}`,
 *   })
 */
export function RecordActivity<TResult = unknown, TBody = unknown>(
  options: RecordActivityOptions<TResult, TBody>,
): MethodDecorator {
  return SetMetadata(RECORD_ACTIVITY_KEY, options);
}
