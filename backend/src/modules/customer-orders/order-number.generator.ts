import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { toCompactDateStamp } from '../../common/utils/date-time.util';

/** No 0/O or 1/I so riders can read the code aloud without confusion. */
const READABLE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates short human-friendly order numbers like "AQ261109-7KQ4". */
@Injectable()
export class OrderNumberGenerator {
  generate(orderedAt: Date = new Date()): string {
    let suffix = '';
    for (let index = 0; index < 4; index++) {
      suffix += READABLE_CHARACTERS[randomInt(READABLE_CHARACTERS.length)];
    }
    return `AQ${toCompactDateStamp(orderedAt)}-${suffix}`;
  }
}
