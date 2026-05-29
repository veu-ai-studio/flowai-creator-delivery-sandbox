import { getInstallationToken } from '../src/lib/agents/renewal/githubApp.js';
const { token } = await getInstallationToken();

async function probe(label, url) {
  const r = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  console.log(`${label}  status=${r.status} ${r.statusText}`);
  if (r.ok) {
    const j = await r.json();
    if (j.object?.sha) console.log(`  object.sha=${j.object.sha}`);
    if (Array.isArray(j.tree)) console.log(`  tree.length=${j.tree.length} truncated=${j.truncated}`);
    if (j.default_branch) console.log(`  default_branch=${j.default_branch}`);
  } else {
    const t = await r.text();
    console.log(`  body=${t.slice(0, 160)}`);
  }
}

const owner = 'victor2081new-cloud';
const repo = 'flowai';
await probe('repo-meta', `https://api.github.com/repos/${owner}/${repo}`);
await probe('ref-main', `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`);
await probe('ref-flowai-v0.1', `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/flowai-v0.1`);
