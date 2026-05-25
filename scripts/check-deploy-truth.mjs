#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  buildDeployTruthArtifact,
  fetchProductionVersion,
  persistDeployTruthArtifact,
  summarizeDeployTruth,
} from '../src/lib/governance/deployTruth.js';
import { appendGovernanceEntry } from '../src/lib/agents/renewal/optionCPipeline.js';

const execFileAsync = promisify(execFile);

async function git(args) {
  const { stdout } = await execFileAsync('git', args, {
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

async function loadSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function loadKvClient() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const mod = await import('@vercel/kv');
    return mod.kv || null;
  } catch {
    return null;
  }
}

async function commitsAheadOfProduction(productionCommit) {
  if (!productionCommit) return [];
  try {
    const raw = await git(['log', '--oneline', `${productionCommit}..HEAD`]);
    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    const head = await git(['rev-parse', '--short=12', 'HEAD']).catch(() => '');
    return head ? [`${head} HEAD not comparable to production commit ${productionCommit}`] : [];
  }
}

async function main() {
  const productionUrl = process.env.FLOWAI_PRODUCTION_URL || 'https://flowai-dun.vercel.app';
  const localHeadCommit = await git(['rev-parse', 'HEAD']);
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const versionResult = await fetchProductionVersion({ productionUrl });
  const productionCommit = versionResult.version?.commitFull || versionResult.version?.commit || null;
  const driftDetails = productionCommit && productionCommit !== localHeadCommit
    ? await commitsAheadOfProduction(productionCommit)
    : [];
  const artifact = buildDeployTruthArtifact({
    productionVersion: versionResult.version,
    localHeadCommit,
    branch,
    driftDetails,
    blockedReason: versionResult.ok ? null : versionResult.reason,
  });
  const supabase = await loadSupabaseClient();
  const kv = supabase ? null : await loadKvClient();
  const persistence = await persistDeployTruthArtifact({
    artifact,
    supabase,
    kv,
    appendGovernanceEntry,
  });
  const summary = summarizeDeployTruth({ artifact, persistence });

  console.log(JSON.stringify(summary, null, 2));
  if (!persistence.written) process.exitCode = 2;
  else if (artifact.status === 'DRIFT') process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error?.message || String(error),
  }));
  process.exitCode = 2;
});
