import { describe, expect, it } from 'vitest'
import { hasInvalidNotificationDateRange } from '../utils/schedule'

describe('notification schedule validation', () => {
  it('accepts a missing start or expiry date', () => {
    expect(hasInvalidNotificationDateRange(null, null)).toBe(false)
    expect(hasInvalidNotificationDateRange('2026-11-06T08:00:00.000Z', null)).toBe(false)
    expect(hasInvalidNotificationDateRange(null, '2026-11-06T08:00:00.000Z')).toBe(false)
  })

  it('rejects invalid dates and an expiry at or before the start', () => {
    expect(hasInvalidNotificationDateRange('invalid', '2026-11-06T08:00:00.000Z')).toBe(true)
    expect(
      hasInvalidNotificationDateRange(
        '2026-11-06T08:00:00.000Z',
        '2026-11-06T08:00:00.000Z',
      ),
    ).toBe(true)
    expect(
      hasInvalidNotificationDateRange(
        '2026-11-07T08:00:00.000Z',
        '2026-11-06T08:00:00.000Z',
      ),
    ).toBe(true)
  })

  it('accepts an expiry after the start', () => {
    expect(
      hasInvalidNotificationDateRange(
        '2026-11-06T08:00:00.000Z',
        '2026-11-07T08:00:00.000Z',
      ),
    ).toBe(false)
  })
})
