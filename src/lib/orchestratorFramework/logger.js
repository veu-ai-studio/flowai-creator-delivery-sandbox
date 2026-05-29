import { makeLogger } from '../shared/logger.js';

function consoleSink(record) {
  const level = record.level === 'error' ? 'error' : record.level === 'warn' ? 'warn' : 'info';
  const payload = {
    timestamp: new Date(record.ts).toISOString(),
    module: record.fields?.module ?? 'orchestratorFramework',
    event: record.msg,
    level: record.level.toUpperCase(),
    payload: record.fields ?? {},
  };
  console[level](JSON.stringify(payload));
}

export const orchestratorLogger = makeLogger({
  sink: consoleSink,
  baseFields: { module: 'orchestratorFramework' },
});

export function createOrchestratorLogger(moduleName) {
  return orchestratorLogger.child({ module: moduleName });
}
