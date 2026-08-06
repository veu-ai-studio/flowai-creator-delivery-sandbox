Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ProjectRef = 'rsulqkfweaxrhuzjhjrs'
$script:SecretPattern = '^sb_secret_[A-Za-z0-9_-]+$'
$script:BlobName = 'supabase-service-role.dpapi.json'
$script:EntropyLabel = "FlowAI|Supabase|staging|$($script:ProjectRef)|v1"

function Assert-Windows {
  if (-not $IsWindows) { throw 'FLOWAI_CREDENTIAL_STORE_WINDOWS_REQUIRED' }
}

function Get-StorePath([string]$RootOverride) {
  $root = if ($RootOverride) { $RootOverride } else {
    Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'FlowAI\credentials\staging\rsulqkfweaxrhuzjhjrs'
  }
  return @{ Root = $root; Blob = (Join-Path $root $script:BlobName) }
}

function Get-Entropy {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($script:EntropyLabel)) }
  finally { $sha.Dispose() }
}

function Set-StrictAcl([string]$Path) {
  $user = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
  $acl = Get-Acl -LiteralPath $Path
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($existing in @($acl.Access)) { [void]$acl.RemoveAccessRuleAll($existing) }
  foreach ($sid in @($user, $system)) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [Security.AccessControl.FileSystemRights]::FullControl,
      [Security.AccessControl.InheritanceFlags]::None,
      [Security.AccessControl.PropagationFlags]::None,
      [Security.AccessControl.AccessControlType]::Allow
    )
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $Path -AclObject $acl
}

function Assert-StrictAcl([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { throw 'FLOWAI_CREDENTIAL_BLOB_MISSING' }
  $userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $allowed = @($userSid, 'S-1-5-18')
  $acl = Get-Acl -LiteralPath $Path
  if (-not $acl.AreAccessRulesProtected) { throw 'FLOWAI_CREDENTIAL_ACL_WEAK' }
  if ($acl.Owner -ne $userSid -and $acl.Owner -ne [Security.Principal.WindowsIdentity]::GetCurrent().Name) {
    throw 'FLOWAI_CREDENTIAL_ACL_WEAK'
  }
  foreach ($rule in $acl.Access) {
    $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    if ($sid -notin $allowed -or $rule.AccessControlType -ne 'Allow') { throw 'FLOWAI_CREDENTIAL_ACL_WEAK' }
  }
  foreach ($sid in $allowed) {
    if (-not ($acl.Access | Where-Object {
      $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -eq $sid -and
      ($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl)
    })) { throw 'FLOWAI_CREDENTIAL_ACL_WEAK' }
  }
}

function Protect-Secret([string]$Secret) {
  $plain = [Text.Encoding]::UTF8.GetBytes($Secret)
  $entropy = Get-Entropy
  try {
    return [Security.Cryptography.ProtectedData]::Protect(
      $plain, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
  } finally {
    [Array]::Clear($plain, 0, $plain.Length)
    [Array]::Clear($entropy, 0, $entropy.Length)
  }
}

function Unprotect-Blob([string]$BlobPath) {
  Assert-StrictAcl $BlobPath
  try { $record = Get-Content -LiteralPath $BlobPath -Raw | ConvertFrom-Json -ErrorAction Stop }
  catch { throw 'FLOWAI_CREDENTIAL_BLOB_INVALID' }
  if ($record.version -ne 1 -or $record.projectRef -ne $script:ProjectRef -or $record.environment -ne 'staging') {
    throw 'FLOWAI_CREDENTIAL_PROJECT_MISMATCH'
  }
  try { $cipher = [Convert]::FromBase64String([string]$record.ciphertext) }
  catch { throw 'FLOWAI_CREDENTIAL_BLOB_INVALID' }
  $entropy = Get-Entropy
  $plain = $null
  try {
    $plain = [Security.Cryptography.ProtectedData]::Unprotect(
      $cipher, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $secret = [Text.Encoding]::UTF8.GetString($plain)
    if ($secret -notmatch $script:SecretPattern) { throw 'FLOWAI_CREDENTIAL_SECRET_INVALID' }
    return $secret
  } catch {
    if ($_.Exception.Message -like 'FLOWAI_*') { throw }
    throw 'FLOWAI_CREDENTIAL_DECRYPT_FAILED'
  } finally {
    if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
    [Array]::Clear($cipher, 0, $cipher.Length)
    [Array]::Clear($entropy, 0, $entropy.Length)
  }
}

function Save-FlowAIStagingCredential {
  [CmdletBinding()] param(
    [ValidateSet('Capture','Rotate')] [string]$Operation = 'Capture',
    [scriptblock]$ClipboardReader = { (Get-Clipboard -Raw).Trim() },
    [string]$RootOverride,
    [switch]$FixtureMode
  )
  Assert-Windows
  $paths = Get-StorePath $RootOverride
  $secret = $null
  $cipher = $null
  try {
    $secret = [string](& $ClipboardReader)
    $secret = $secret.Trim()
    if ($secret -notmatch $script:SecretPattern) { throw 'FLOWAI_CREDENTIAL_SECRET_INVALID' }
    if ($Operation -eq 'Capture' -and (Test-Path -LiteralPath $paths.Blob)) { throw 'FLOWAI_CREDENTIAL_ALREADY_EXISTS' }
    New-Item -ItemType Directory -Path $paths.Root -Force | Out-Null
    Set-StrictAcl $paths.Root
    [byte[]]$cipher = @(Protect-Secret $secret)
    $record = [ordered]@{ version=1; projectRef=$script:ProjectRef; environment='staging'; scope='CurrentUser'; ciphertext=[Convert]::ToBase64String($cipher) }
    $temp = Join-Path $paths.Root ([IO.Path]::GetRandomFileName())
    try {
      $record | ConvertTo-Json -Compress | Set-Content -LiteralPath $temp -NoNewline -Encoding UTF8
      Set-StrictAcl $temp
      Move-Item -LiteralPath $temp -Destination $paths.Blob -Force
      Assert-StrictAcl $paths.Blob
    } finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force } }
    return [pscustomobject]@{ ok=$true; action=$Operation.ToLowerInvariant(); projectRef=$script:ProjectRef; secretExposed=$false }
  } catch {
    $code = if ($_.Exception.Message -like 'FLOWAI_*') { $_.Exception.Message } else { 'FLOWAI_CREDENTIAL_CAPTURE_FAILED' }
    throw $code
  } finally {
    $secret = $null
    if ($cipher) { [Array]::Clear($cipher, 0, $cipher.Length) }
    if (-not $FixtureMode) { try { Set-Clipboard -Value $null } catch { } }
  }
}

function Remove-FlowAIStagingCredential {
  [CmdletBinding()] param([string]$RootOverride)
  Assert-Windows
  $paths = Get-StorePath $RootOverride
  if (Test-Path -LiteralPath $paths.Blob) { Assert-StrictAcl $paths.Blob; Remove-Item -LiteralPath $paths.Blob -Force }
  return [pscustomobject]@{ ok=$true; action='delete'; projectRef=$script:ProjectRef; secretExposed=$false }
}

function Get-FlowAIStagingCredentialStatus {
  [CmdletBinding()] param([string]$RootOverride)
  Assert-Windows
  $paths = Get-StorePath $RootOverride
  if (-not (Test-Path -LiteralPath $paths.Blob)) { return [pscustomobject]@{ ready=$false; reason='missing'; projectRef=$script:ProjectRef } }
  Assert-StrictAcl $paths.Blob
  return [pscustomobject]@{ ready=$true; reason='protected'; projectRef=$script:ProjectRef }
}

function Use-FlowAIStagingCredential {
  [CmdletBinding()] param([Parameter(Mandatory)] [scriptblock]$ScriptBlock, [string]$RootOverride)
  Assert-Windows
  $paths = Get-StorePath $RootOverride
  $secret = $null
  try {
    $secret = Unprotect-Blob $paths.Blob
    & $ScriptBlock $secret
  } catch {
    $code = if ($_.Exception.Message -like 'FLOWAI_*') { $_.Exception.Message } else { 'FLOWAI_CREDENTIAL_USE_FAILED' }
    throw $code
  } finally { $secret = $null }
}

Export-ModuleMember -Function Save-FlowAIStagingCredential,Remove-FlowAIStagingCredential,Get-FlowAIStagingCredentialStatus,Use-FlowAIStagingCredential
