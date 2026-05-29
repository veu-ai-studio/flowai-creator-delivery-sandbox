// src/lib/fixReview/checks/regressionRisk.js
//
// Q1: Will this break another feature? (regression risk)
//
// Signal: how many places import / consume each changed file? A change
// to a leaf file used in one place is low risk; a change to a module
// imported across the codebase is high risk and warrants extra eyes.
//
// Input contract: repoContext.importGraph is an optional map of
//   { '<file path>': string[] }  — files that import the key.
// When the import graph is not provided, the check returns 'unknown'
// rather than guessing — no fabrication.

'use strict';

const HIGH_FAN_IN = 10;
const MEDIUM_FAN_IN = 3;

export function checkRegressionRisk({ diff, repoContext }) {
  const importGraph = repoContext?.importGraph;
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) {
    return { verdict: 'pass', evidence: ['no_files_changed'] };
  }
  if (!importGraph || typeof importGraph !== 'object') {
    return {
      verdict: 'unknown',
      evidence: ['no_import_graph_supplied — cannot compute fan-in'],
      suggestion: 'Pass repoContext.importGraph to get a real verdict. Without it, regression risk is opaque.',
    };
  }
  const perFile = [];
  let maxFanIn = 0;
  for (const f of files) {
    const importers = Array.isArray(importGraph[f.path]) ? importGraph[f.path] : [];
    perFile.push({ path: f.path, fanIn: importers.length });
    if (importers.length > maxFanIn) maxFanIn = importers.length;
  }
  if (maxFanIn >= HIGH_FAN_IN) {
    return {
      verdict: 'fail',
      evidence: perFile
        .filter((p) => p.fanIn >= HIGH_FAN_IN)
        .map((p) => `high_fan_in:${p.path} (importers=${p.fanIn})`),
      suggestion: 'High-fan-in module — add a regression test that exercises at least one downstream importer before merging.',
    };
  }
  if (maxFanIn >= MEDIUM_FAN_IN) {
    return {
      verdict: 'warn',
      evidence: perFile
        .filter((p) => p.fanIn >= MEDIUM_FAN_IN)
        .map((p) => `medium_fan_in:${p.path} (importers=${p.fanIn})`),
      suggestion: 'Several downstream importers — eyeball at least one to confirm no behavior change.',
    };
  }
  return {
    verdict: 'pass',
    evidence: [`max_fan_in=${maxFanIn}_across_${files.length}_changed_files`],
  };
}
