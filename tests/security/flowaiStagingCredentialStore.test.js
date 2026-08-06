import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const modulePath = new URL('../../scripts/security/FlowAI.StagingCredentialStore.psm1', import.meta.url).pathname.replace(/^\//, '');
const fixture = 'sb_secret_FlowAIFixtureOnly_123456789';

function run(script) {
  return execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' }).trim();
}

describe.runIf(process.platform === 'win32')('FlowAI staging DPAPI credential store', () => {
  it('encrypts with CurrentUser DPAPI and project-specific entropy without plaintext persistence', () => {
    const root = mkdtempSync(join(tmpdir(), 'flowai-dpapi-'));
    try {
      const output = run(`Import-Module '${modulePath}'; Save-FlowAIStagingCredential -ClipboardReader { '${fixture}' } -RootOverride '${root}' -FixtureMode | ConvertTo-Json -Compress`);
      const blob = readFileSync(join(root, 'supabase-service-role.dpapi.json'), 'utf8');
      expect(output).not.toContain(fixture);
      expect(blob).not.toContain(fixture);
      expect(JSON.parse(blob)).toMatchObject({ projectRef: 'rsulqkfweaxrhuzjhjrs', environment: 'staging', scope: 'CurrentUser' });
      expect(readFileSync(modulePath, 'utf8')).toContain('FlowAI|Supabase|staging|$($script:ProjectRef)|v1');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('decrypts only into a callback and redacts tamper/project failures', () => {
    const root = mkdtempSync(join(tmpdir(), 'flowai-dpapi-'));
    try {
      const output = run(`Import-Module '${modulePath}'; Save-FlowAIStagingCredential -ClipboardReader { '${fixture}' } -RootOverride '${root}' -FixtureMode | Out-Null; Use-FlowAIStagingCredential -RootOverride '${root}' -ScriptBlock { param($s) [pscustomobject]@{ valid=($s -match '^sb_secret_'); length=$s.Length } } | ConvertTo-Json -Compress`);
      expect(JSON.parse(output)).toMatchObject({ valid: true, length: fixture.length });
      expect(output).not.toContain(fixture);
      const blobPath = join(root, 'supabase-service-role.dpapi.json');
      const record = JSON.parse(readFileSync(blobPath, 'utf8'));
      record.projectRef = 'wrong-project';
      writeFileSync(blobPath, JSON.stringify(record));
      const error = run(`Import-Module '${modulePath}'; try { Use-FlowAIStagingCredential -RootOverride '${root}' -ScriptBlock { param($s) $s } } catch { $_.Exception.Message }`);
      expect(error).toBe('FLOWAI_CREDENTIAL_PROJECT_MISMATCH');
      expect(error).not.toContain(fixture);

      record.projectRef = 'rsulqkfweaxrhuzjhjrs';
      record.ciphertext = `${record.ciphertext[0] === 'A' ? 'B' : 'A'}${record.ciphertext.slice(1)}`;
      writeFileSync(blobPath, JSON.stringify(record));
      const tamperError = run(`Import-Module '${modulePath}'; try { Use-FlowAIStagingCredential -RootOverride '${root}' -ScriptBlock { param($s) $s } } catch { $_.Exception.Message }`);
      expect(tamperError).toBe('FLOWAI_CREDENTIAL_DECRYPT_FAILED');
      expect(tamperError).not.toContain(fixture);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('enforces protected current-user/SYSTEM ACLs and deletes the blob', () => {
    const root = mkdtempSync(join(tmpdir(), 'flowai-dpapi-'));
    try {
      const output = run(`Import-Module '${modulePath}'; Save-FlowAIStagingCredential -ClipboardReader { '${fixture}' } -RootOverride '${root}' -FixtureMode | Out-Null; $p=Join-Path '${root}' 'supabase-service-role.dpapi.json'; $a=Get-Acl $p; $s=@($a.Access | ForEach-Object { $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value } | Sort-Object -Unique); $before=Test-Path $p; Remove-FlowAIStagingCredential -RootOverride '${root}' | Out-Null; [pscustomobject]@{ protected=$a.AreAccessRulesProtected; sids=$s; existed=$before; deleted=(-not (Test-Path $p)) } | ConvertTo-Json -Compress`);
      const result = JSON.parse(output);
      expect(result).toMatchObject({ protected: true, existed: true, deleted: true });
      expect(result.sids).toContain('S-1-5-18');
      expect(result.sids).toHaveLength(2);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('fails closed when an extra principal is granted access', () => {
    const root = mkdtempSync(join(tmpdir(), 'flowai-dpapi-'));
    try {
      const error = run(`Import-Module '${modulePath}'; Save-FlowAIStagingCredential -ClipboardReader { '${fixture}' } -RootOverride '${root}' -FixtureMode | Out-Null; $p=Join-Path '${root}' 'supabase-service-role.dpapi.json'; & icacls.exe $p /grant '*S-1-5-32-545:(R)' | Out-Null; try { Get-FlowAIStagingCredentialStatus -RootOverride '${root}' | Out-Null } catch { $_.Exception.Message }`);
      expect(error).toBe('FLOWAI_CREDENTIAL_ACL_WEAK');
      expect(error).not.toContain(fixture);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('is fail-closed for missing blobs and contains no secret-print action', () => {
    const root = mkdtempSync(join(tmpdir(), 'flowai-dpapi-'));
    try {
      const error = run(`Import-Module '${modulePath}'; try { Use-FlowAIStagingCredential -RootOverride '${root}' -ScriptBlock { param($s) $s } } catch { $_.Exception.Message }`);
      expect(error).toBe('FLOWAI_CREDENTIAL_BLOB_MISSING');
      const wrapper = readFileSync(new URL('../../scripts/security/flowai-staging-credential.ps1', import.meta.url), 'utf8');
      expect(wrapper).toContain("ValidateSet('Capture','Rotate','Delete','Status')");
      expect(wrapper).not.toMatch(/ValidateSet\([^)]*(Get|Read|Print)/i);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
