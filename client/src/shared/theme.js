export { MODES, MODE_ORDER } from './modes';

export const PLANS = {
  free:    { label: 'Free',    interviews: 3,  price: '$0' },
  starter: { label: 'Starter', interviews: 20, price: '$9.99/mo' },
  growth:  { label: 'Growth',  interviews: -1, price: '$24.99/mo' },
};

export const SIGNAL_LABELS = {
  strong_positive: 'Strong positive',
  positive:        'Positive',
  mixed:           'Mixed',
  negative:        'Negative',
};

export const INSIGHT_ICONS = {
  positive:    '↑',
  negative:    '↓',
  opportunity: '◆',
  risk:        '⚠',
};

export const INSIGHT_COLORS = {
  positive:    { border: 'var(--pos)',  bg: 'var(--pos-l)' },
  negative:    { border: 'var(--err)',  bg: 'var(--err-l)' },
  opportunity: { border: 'var(--info)', bg: 'var(--info-l)' },
  risk:        { border: 'var(--warn)', bg: 'var(--warn-l)' },
};
