import { getInstallationToken } from '../src/lib/agents/renewal/githubApp.js';
const t = await getInstallationToken();
console.log('Token acquired:', t.token ? 'YES (hidden)' : 'NO');
console.log('Expires:', t.expiresAt);
