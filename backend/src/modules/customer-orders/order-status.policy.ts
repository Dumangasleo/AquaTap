import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus } from '../../common/enums/domain.enums';

export type OrderAction = 'accept' | 'decline' | 'cancel' | 'deliver' | 'fail';

interface OrderTransitionRule {
  allowedFrom: OrderStatus[];
  nextStatus: OrderStatus;
  /** Shown when the action is not allowed from the current status. */
  notAllowedMessage: string;
}

/**
 * The order state machine in one place (Open/Closed Principle): adding a new status or action
 * means adding a rule here instead of editing if/else chains across services.
 *
 *   Pending ──accept──▶ Accepted ──deliver──▶ Delivered
 *      │                    └────fail───────▶ Failed
 *      ├──decline (staff)──▶ Declined
 *      └──cancel (customer)▶ Cancelled
 */
const ORDER_TRANSITION_RULES: Record<OrderAction, OrderTransitionRule> = {
  accept: {
    allowedFrom: [OrderStatus.Pending],
    nextStatus: OrderStatus.Accepted,
    notAllowedMessage: 'Only pending orders can be accepted.',
  },
  decline: {
    allowedFrom: [OrderStatus.Pending],
    nextStatus: OrderStatus.Declined,
    notAllowedMessage: 'Only pending orders can be declined.',
  },
  cancel: {
    allowedFrom: [OrderStatus.Pending],
    nextStatus: OrderStatus.Cancelled,
    notAllowedMessage: 'This order can no longer be cancelled because the station already accepted it.',
  },
  deliver: {
    allowedFrom: [OrderStatus.Accepted],
    nextStatus: OrderStatus.Delivered,
    notAllowedMessage: 'Only accepted orders can be marked as delivered.',
  },
  fail: {
    allowedFrom: [OrderStatus.Accepted],
    nextStatus: OrderStatus.Failed,
    notAllowedMessage: 'Only accepted orders can be marked as failed.',
  },
};

@Injectable()
export class OrderStatusPolicy {
  getRule(action: OrderAction): OrderTransitionRule {
    return ORDER_TRANSITION_RULES[action];
  }

  /** Throws a friendly error when the action is not allowed for the current status. */
  assertCanTransition(currentStatus: OrderStatus, action: OrderAction): OrderTransitionRule {
    const rule = this.getRule(action);
    if (!rule.allowedFrom.includes(currentStatus)) {
      throw new BadRequestException(`${rule.notAllowedMessage} (Current status: ${currentStatus})`);
    }
    return rule;
  }
}
