/**
 * Single source for survey mode display labels and title derivation (exports + synthesis).
 */
const SURVEY_MODE_LABELS = {
  founder: 'Idea Validation',
  csat: 'Customer Satisfaction',
  researcher: 'Academic Research',
  product: 'Product Feedback',
  event: 'Event Feedback',
  hr: 'Team Pulse',
};

/** Primary topic field per mode — immutable after survey creation (edit other fields only). */
const MODE_LOCKED_TOPIC_KEY = {
  founder: 'idea',
  csat: 'business',
  researcher: 'rq',
  product: 'product',
  event: 'event',
  hr: 'team',
};

function deriveSurveyTitle(config) {
  const c = config || {};
  const pick = (s) => {
    if (!s || !String(s).trim()) return '';
    return String(s).trim().split(/\s+/).slice(0, 10).join(' ');
  };
  return (
    pick(c.idea)
    || pick(c.business)
    || pick(c.rq)
    || pick(c.product)
    || pick(c.event)
    || pick(c.team)
    || 'Untitled survey'
  );
}

module.exports = {
  SURVEY_MODE_LABELS,
  deriveSurveyTitle,
  MODE_LOCKED_TOPIC_KEY,
};
