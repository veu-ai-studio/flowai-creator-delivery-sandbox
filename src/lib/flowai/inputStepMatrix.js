import { FLOWAI_MACRO_STEPS } from '../flowaiRunStore.js';
import { FLOWAI_INPUT_TYPES, summarizeFlowAIInputContext } from './unifiedRunInput.js';

export const FLOWAI_STEP_PURPOSES = Object.freeze({
  research: 'Crawl URL, analyze requested objectives, and process attachment context',
  design: 'Map findings and user objectives to an ordered fix plan',
  build: 'Generate fixes and commit them to the upgrade target',
  qa_audit: 'Verify the upgraded state does not regress and objectives are addressed',
  deploy: 'Deploy the upgrade target to a live URL',
  self_renewal: 'Compare original and upgraded versions and decide whether to iterate',
  gtm: 'Evaluate CEO 95/100 readiness and market-facing completeness',
  monitor: 'Record ongoing tracking recommendations for both versions',
});

export const FLOWAI_MODE_BEHAVIOR = Object.freeze({
  research: {
    auto: 'Runs research silently',
    guided: 'Checkpoint: Research complete. Continue?',
    manual: 'User triggers research and decides follow-up investigation',
  },
  design: {
    auto: 'Generates fix plan silently',
    guided: 'Checkpoint: Approve, modify, or skip proposed fix plan',
    manual: 'User designs or approves the fix plan',
  },
  build: {
    auto: 'Generates and commits app-layer fixes automatically',
    guided: 'Checkpoint: Review generated fixes before commit',
    manual: 'User writes or approves each fix',
  },
  qa_audit: {
    auto: 'Blocks regressions automatically',
    guided: 'Checkpoint: Review passed/regressed items before proceeding',
    manual: 'User reviews audit and decides rollback/proceed',
  },
  deploy: {
    auto: 'Provisions and deploys automatically when credentials allow',
    guided: 'Checkpoint: Approve deployment target before deploy',
    manual: 'User deploys manually and supplies the URL',
  },
  self_renewal: {
    auto: 'Scores comparison silently and iterates when policy allows',
    guided: 'Checkpoint: Accept score delta or iterate',
    manual: 'User runs scoring manually',
  },
  gtm: {
    auto: 'Assesses readiness silently with honest evidence buckets',
    guided: 'Checkpoint: Review GTM readiness before publish decision',
    manual: 'User evaluates GTM readiness',
  },
  monitor: {
    auto: 'Records monitoring recommendation without creating recurring jobs',
    guided: 'Checkpoint: Pick monitoring frequency',
    manual: 'User triggers monitoring manually',
  },
});

const INPUT_USAGE = Object.freeze({
  research: {
    url: 'used',
    description: 'used',
    attachments: 'used',
  },
  design: {
    url: 'used',
    description: 'used',
    attachments: 'used',
  },
  build: {
    url: 'preserved',
    description: 'used',
    attachments: 'preserved',
  },
  qa_audit: {
    url: 'used',
    description: 'used',
    attachments: 'preserved',
  },
  deploy: {
    url: 'preserved',
    description: 'preserved',
    attachments: 'preserved',
  },
  self_renewal: {
    url: 'used',
    description: 'used',
    attachments: 'preserved',
  },
  gtm: {
    url: 'used',
    description: 'used',
    attachments: 'preserved',
  },
  monitor: {
    url: 'used',
    description: 'used',
    attachments: 'preserved',
  },
});

function usageForInput({ step, type, contextSummary }) {
  const desired = INPUT_USAGE[step]?.[type] ?? 'unused_with_reason';
  const present = type === 'url'
    ? contextSummary.urlPresent
    : type === 'description'
      ? contextSummary.descriptionPresent
      : contextSummary.attachmentCount > 0;
  if (!present) {
    return Object.freeze({
      state: 'unused_with_reason',
      reason: `${type} input not provided`,
    });
  }
  if (desired === 'preserved') {
    return Object.freeze({
      state: 'preserved',
      reason: 'carried forward for audit/reporting context',
    });
  }
  return Object.freeze({
    state: desired,
    reason: null,
  });
}

export function buildFlowAIInputStepMatrix({ inputContext = {}, mode = 'auto' } = {}) {
  const contextSummary = summarizeFlowAIInputContext(inputContext);
  return Object.freeze(FLOWAI_MACRO_STEPS.reduce((acc, step) => {
    acc[step] = Object.freeze({
      step,
      purpose: FLOWAI_STEP_PURPOSES[step],
      modeBehavior: FLOWAI_MODE_BEHAVIOR[step]?.[mode] ?? FLOWAI_MODE_BEHAVIOR[step]?.auto,
      inputs: Object.freeze(FLOWAI_INPUT_TYPES.reduce((inputAcc, type) => {
        inputAcc[type] = usageForInput({ step, type, contextSummary });
        return inputAcc;
      }, {})),
    });
    return acc;
  }, {}));
}
