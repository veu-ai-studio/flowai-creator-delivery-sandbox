import { produceMonitorText } from '../src/lib/agents/renewal/monitorTextProducer.js';
import { computeScore } from '../src/lib/agents/renewal/preScoreAdapter.js';

const monitor = await produceMonitorText({
  url: 'https://mypreglife-platform.vercel.app',
  productId: 'mypreglife',
  runId: 'test-scoring',
});
console.log('Monitor text length:', monitor.monitorText.length);
console.log('Page title:', monitor.pageTitle);
console.log('Word count:', monitor.wordCount);
console.log('Model:', monitor.model);
console.log('Usage:', JSON.stringify(monitor.usage));

const score = await computeScore({
  productId: 'mypreglife',
  url: 'https://mypreglife-platform.vercel.app',
  runId: 'test-scoring',
  monitorText: monitor.monitorText,
});
console.log('SCORE:', JSON.stringify(score, null, 2));
