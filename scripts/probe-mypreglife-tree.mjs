import { getInstallationToken } from '../src/lib/agents/renewal/githubApp.js';
import { fetchRepoFileList } from '../src/lib/agents/renewal/orchestrator.js';

const { token } = await getInstallationToken();
const r = await fetchRepoFileList({
  owner: 'veu-ai-studio', repo: 'my-preg-life', ref: 'main', token,
});
console.log('error:', r.error, 'sha:', r.sha, 'truncated:', r.truncated, 'files.length:', r.files?.length);
if (r.files?.length) {
  console.log('first 10 files:');
  for (const f of r.files.slice(0, 10)) console.log('  ' + f);
}
