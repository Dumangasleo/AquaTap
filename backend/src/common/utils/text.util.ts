/** "  leo   isidro dumangas " -> "LEO ISIDRO DUMANGAS" (names are stored uppercase, like official records). */
export function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Rounds money to 2 decimal places to avoid floating point drift (e.g. 0.1 + 0.2). */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** 1234.5 -> "₱1,234.50", -25 -> "-₱25.00" (used in sentences shown to the user, e.g. the activity log). */
export function formatPeso(amount: number): string {
  const formattedAmount = Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}₱${formattedAmount}`;
}

/** 1 -> "1 gallon", 3 -> "3 gallons". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "VehicleRepair" -> "Vehicle repair" (turns enum names into words a customer can read). */
export function humanizeEnumName(enumName: string): string {
  const words = enumName.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
