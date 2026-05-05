/**
 * Strip internal interview tokens from text shown to humans.
 * Assistant sometimes echoes [AT_LIMIT] from API context; transcripts may be legacy.
 */
export function visibleMessageContent(role, content) {
  if (!content || typeof content !== 'string') return content;
  if (role !== 'assistant') return content;
  return content
    .replace(/\s*\[AT_LIMIT\]\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
