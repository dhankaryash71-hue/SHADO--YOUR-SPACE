export const TIMER_DURATIONS = {
  OFF: 0,
  '5m': 5 * 60 * 1000, // 5 minutes
  '1h': 60 * 60 * 1000, // 1 hour
  '24h': 24 * 60 * 60 * 1000, // 24 hours
  '7d': 7 * 24 * 60 * 60 * 1000, // 7 days
  '90d': 90 * 24 * 60 * 60 * 1000, // 90 days
};

export const TIMER_LABELS = {
  OFF: 'Off',
  '5m': '5 minutes',
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '90d': '90 days',
};

export const normalizeTimerOption = (timer) => {
  if (!timer) return 'OFF';
  const clean = String(timer).trim().toUpperCase();
  if (clean === 'OFF' || clean === '0' || clean === 'NONE') return 'OFF';
  if (clean === '5M' || clean === '5_MINUTES' || clean === '5_MINS' || clean === '5MIN') return '5m';
  if (clean === '1H' || clean === '1_HOUR' || clean === '1HOUR') return '1h';
  if (clean === '24H' || clean === '24_HOURS' || clean === '24HOURS' || clean === '1D') return '24h';
  if (clean === '7D' || clean === '7_DAYS' || clean === '7DAYS' || clean === '1W') return '7d';
  if (clean === '90D' || clean === '90_DAYS' || clean === '90DAYS' || clean === '3M') return '90d';
  if (TIMER_DURATIONS[timer]) return timer;
  return null;
};

export const calculateExpiration = (timerOption) => {
  const normalized = normalizeTimerOption(timerOption);
  if (!normalized || normalized === 'OFF') return null;
  const duration = TIMER_DURATIONS[normalized];
  if (!duration) return null;
  return new Date(Date.now() + duration);
};
