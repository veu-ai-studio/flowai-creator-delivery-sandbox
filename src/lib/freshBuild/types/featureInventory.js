export const UNKNOWN = 'UNKNOWN';
export const AUTH_REQUIRED = 'AUTH_REQUIRED';

export const REQUIRED_FEATURE_INVENTORY_FIELDS = [
  'url',
  'pages',
  'components',
  'userFlows',
  'content',
  'businessRules',
  'metadata',
];

/**
 * @typedef {Object} ConfidenceValue
 * @property {number} confidence - Confidence score from 0 to 1.
 */

/**
 * @typedef {Object} FeaturePage
 * @property {string} url - Page URL or UNKNOWN when unavailable.
 * @property {string} title - Page title or UNKNOWN when unavailable.
 * @property {string} purpose - Inferred page purpose or UNKNOWN.
 * @property {string} primaryContent - Primary content summary or UNKNOWN.
 * @property {Array<{label:string,target:string,confidence:number}>} navigation - Links found on the page.
 * @property {{parent:string,children:string[],confidence:number}} hierarchy - Parent/child page relationship.
 * @property {'PUBLIC'|'AUTH_REQUIRED'|'UNKNOWN'} access - Whether the page content is public, auth-gated, or unknown.
 * @property {number} confidence - Page extraction confidence from 0 to 1.
 */

/**
 * @typedef {Object} FeatureComponent
 * @property {string} id - Stable component id.
 * @property {string} type - Component type: nav, hero, card, form, modal, table, list, button, footer, etc.
 * @property {string} content - Component text/content summary or UNKNOWN.
 * @property {string} purpose - Component purpose or UNKNOWN.
 * @property {string[]} pages - Page URLs where this component appears.
 * @property {boolean|'UNKNOWN'} interactive - Whether the component is interactive.
 * @property {number} confidence - Component extraction confidence from 0 to 1.
 */

/**
 * @typedef {Object} FeatureUserFlow
 * @property {string} id - Stable flow id.
 * @property {string} name - Flow name such as sign up, login, search, checkout, submit, or UNKNOWN.
 * @property {Array<{label:string,url:string,confidence:number}>} steps - Ordered steps.
 * @property {string} entryPoint - Flow entry URL or UNKNOWN.
 * @property {string} exitPoint - Flow exit URL or UNKNOWN.
 * @property {Array<{name:string,type:string,required:boolean|'UNKNOWN',confidence:number}>} formFields - Fields involved in the flow.
 * @property {{success:string,error:string,confidence:number}} states - Success and error states.
 * @property {number} confidence - Flow confidence from 0 to 1.
 */

/**
 * @typedef {Object} FeatureInventory
 * @property {string} url - Submitted URL analyzed by the extractor.
 * @property {FeaturePage[]} pages - Discovered pages, including auth-required placeholders when content is gated.
 * @property {FeatureComponent[]} components - Distinct UI components identified across pages.
 * @property {FeatureUserFlow[]} userFlows - User journeys inferred from navigation, forms, and interactions.
 * @property {{textByPage:Object,imageReferences:Array,ctas:Array,toneAndStyle:Object,confidence:number}} content - Text, images, CTAs, tone, and style summary.
 * @property {{accessControl:Object,pricing:Object,validationRules:Array,apiEndpoints:Array,dataEntities:Array,confidence:number}} businessRules - Access, pricing, validation, endpoint, and entity observations.
 * @property {{url:string,totalPagesDiscovered:number,totalComponentsIdentified:number,totalUserFlowsMapped:number,crawlTimestamp:string,version:string,confidence:number}} metadata - Extraction metadata and summary counts.
 */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectConfidenceScores(value, scores = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectConfidenceScores(item, scores);
    return scores;
  }
  if (!isPlainObject(value)) return scores;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'confidence') scores.push(child);
    collectConfidenceScores(child, scores);
  }
  return scores;
}

export function validateFeatureInventory(inventory) {
  const errors = [];
  if (!isPlainObject(inventory)) {
    return { ok: false, errors: ['FeatureInventory must be an object'] };
  }

  for (const field of REQUIRED_FEATURE_INVENTORY_FIELDS) {
    if (!(field in inventory)) errors.push(`Missing required field: ${field}`);
  }

  if (inventory.metadata && !isPlainObject(inventory.metadata)) {
    errors.push('metadata must be an object');
  }

  if (inventory.url && inventory.metadata?.url && inventory.metadata.url !== inventory.url) {
    errors.push('metadata.url must match inventory.url');
  }

  for (const field of ['pages', 'components', 'userFlows']) {
    if (field in inventory && !Array.isArray(inventory[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  for (const score of collectConfidenceScores(inventory)) {
    if (typeof score !== 'number' || score < 0 || score > 1) {
      errors.push(`Invalid confidence score: ${String(score)}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export const validate = validateFeatureInventory;
