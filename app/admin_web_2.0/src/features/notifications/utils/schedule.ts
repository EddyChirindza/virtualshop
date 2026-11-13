export function hasInvalidNotificationDateRange(
  startsAt: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  if (!startsAt || !expiresAt) return false
  const start = new Date(startsAt).getTime()
  const end = new Date(expiresAt).getTime()
  return !Number.isFinite(start) || !Number.isFinite(end) || end <= start
}
