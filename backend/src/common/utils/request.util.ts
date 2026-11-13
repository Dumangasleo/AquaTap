/**
 * Clean client IP for the device list and the activity log.
 * Express reports IPv4 clients as "::ffff:192.168.0.10" on dual-stack sockets and the
 * local machine as "::1"; show plain IPv4 addresses instead.
 */
export function normalizeIpAddress(ipAddress: string | undefined | null): string | null {
  if (!ipAddress) return null;
  const trimmedAddress = ipAddress.trim();
  if (trimmedAddress === '') return null;
  if (trimmedAddress === '::1') return '127.0.0.1';
  return trimmedAddress.startsWith('::ffff:') ? trimmedAddress.slice('::ffff:'.length) : trimmedAddress;
}
