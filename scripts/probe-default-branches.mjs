import { getInstallationToken } from '../src/lib/agents/renewal/githubApp.js';
const { token } = await getInstallationToken();
const repos = [
  ['flowai', 'victor2081new-cloud/flowai'],
  ['mypreglife', 'veu-ai-studio/my-preg-life'],
  ['pressai', 'veu-ai-studio/press-ai'],
  ['reachsms', 'veu-ai-studio/reachsms'],
  ['reltwin', 'veu-ai-studio/rel-twin'],
  ['saige', 'veu-ai-studio/saige'],
];
for (const [name, full] of repos) {
  try {
    const r = await fetch(`https://api.github.com/repos/${full}`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!r.ok) { console.log(`${name} | ${full} | HTTP ${r.status} ${r.statusText}`); continue; }
    const j = await r.json();
    console.log(`${name} | default_branch=${j.default_branch} | private=${j.private} | pushed_at=${j.pushed_at}`);
  } catch (e) {
    console.log(`${name} | error: ${e?.message}`);
  }
}
