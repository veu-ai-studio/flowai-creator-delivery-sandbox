export const FLOWAI_INPUT_TYPES = Object.freeze(['url', 'description', 'attachments']);

function normalizeAttachment(raw, index) {
  if (!raw || typeof raw !== 'object') {
    return Object.freeze({
      id: `attachment_${index + 1}`,
      type: 'notes',
      content: String(raw ?? ''),
      name: null,
      size: null,
    });
  }
  const type = raw.type === 'screenshot' || raw.type === 'text' || raw.type === 'notes'
    ? raw.type
    : (String(raw.name ?? '').match(/\.(png|jpg|jpeg|webp|gif)$/i) ? 'screenshot' : 'notes');
  return Object.freeze({
    id: raw.id ?? `attachment_${index + 1}`,
    type,
    content: typeof raw.content === 'string' ? raw.content : '',
    name: raw.name ?? null,
    size: Number.isFinite(raw.size) ? raw.size : null,
  });
}

function attachmentsFromLegacyInput(input = {}) {
  const explicit = Array.isArray(input.attachments) ? input.attachments : [];
  const fromPasted = typeof input.pastedContent === 'string' && input.pastedContent.trim()
    ? [{ type: 'notes', content: input.pastedContent.trim(), name: 'pasted-context.txt' }]
    : [];
  return [...explicit, ...fromPasted];
}

export function normalizeFlowAIInput(input = {}, fallback = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const url = typeof source.url === 'string' && source.url.trim()
    ? source.url.trim()
    : (typeof fallback.url === 'string' && fallback.url.trim() ? fallback.url.trim() : null);
  const urls = Array.isArray(source.urls) ? source.urls : [];
  const description = typeof source.description === 'string' && source.description.trim()
    ? source.description.trim()
    : (typeof source.productDescription === 'string' && source.productDescription.trim()
        ? source.productDescription.trim()
        : null);
  const attachments = attachmentsFromLegacyInput(source).map(normalizeAttachment);
  return Object.freeze({
    url,
    urls,
    description,
    attachments,
    mode: source.mode ?? fallback.mode ?? 'auto',
    conceptMode: !url,
    receivedInputs: Object.freeze({
      url: Boolean(url),
      urls: urls.length > 0,
      description: Boolean(description),
      attachments: attachments.length > 0,
    }),
  });
}

export function summarizeFlowAIInputContext(context = {}) {
  const attachments = Array.isArray(context.attachments) ? context.attachments : [];
  const byType = attachments.reduce((acc, item) => {
    const type = item?.type ?? 'notes';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  return Object.freeze({
    urlPresent: Boolean(context.url),
    descriptionPresent: Boolean(context.description),
    attachmentCount: attachments.length,
    attachmentTypes: Object.freeze(byType),
    conceptMode: Boolean(context.conceptMode),
  });
}

export function parseUserObjectives(description) {
  if (typeof description !== 'string' || !description.trim()) return [];
  const raw = description
    .split(/\n|;|,(?=\s*(?:add|fix|improve|remove|update|create|make|repair|optimize)\b)/i)
    .map((item) => item.trim())
    .filter(Boolean);
  const items = raw.length > 1 ? raw : description.split(/\band\b/i).map((item) => item.trim()).filter(Boolean);
  return items.slice(0, 12).map((text, index) => Object.freeze({
    id: `objective_${index + 1}`,
    text,
    priority: 'user_requested',
    status: 'pending',
  }));
}
