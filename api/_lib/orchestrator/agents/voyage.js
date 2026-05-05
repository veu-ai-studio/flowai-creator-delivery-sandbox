// Voyage AI agent — embeddings + similarity search.

import { embedText, embedBatch, similaritySearch, isEmbeddingsConfigured, embeddingDimensions } from '../../embeddings.js';
import { successEnvelope, envelope, ErrorCodes, validateEmbeddingsInput } from '../contracts.js';

export const voyageAgent = {
  description: 'Voyage AI embeddings (1024d voyage-3-lite default)',
  isEnabled: isEmbeddingsConfigured,
  validate: validateEmbeddingsInput,
  retry: { attempts: 2, backoffMs: 800 },
  async run({ op = 'embed', text, texts, query, items, textField, topK }) {
    try {
      if (op === 'embed') {
        const vector = await embedText(text);
        return successEnvelope({ agent: 'voyage', output: { vector, dim: embeddingDimensions() } });
      }
      if (op === 'embedBatch') {
        const vectors = await embedBatch(texts || []);
        return successEnvelope({ agent: 'voyage', output: { vectors, dim: embeddingDimensions() } });
      }
      if (op === 'similaritySearch') {
        const results = await similaritySearch(query, items || [], { textField, topK });
        return successEnvelope({ agent: 'voyage', output: { results } });
      }
      return envelope({ agent: 'voyage', code: ErrorCodes.INVALID_INPUT, message: `Unknown op: ${op}` });
    } catch (e) {
      return envelope({ agent: 'voyage', code: ErrorCodes.UPSTREAM_ERROR, message: e.message, retriable: true });
    }
  },
  async health() {
    return { ok: true, configured: isEmbeddingsConfigured(), dim: embeddingDimensions() };
  },
};
