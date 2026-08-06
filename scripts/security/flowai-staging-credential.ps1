[CmdletBinding()]
param([Parameter(Mandatory)][ValidateSet('Capture','Rotate','Delete','Status')][string]$Action)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'FlowAI.StagingCredentialStore.psm1') -Force
try {
  $result = switch ($Action) {
    'Capture' { Save-FlowAIStagingCredential -Operation Capture }
    'Rotate' { Save-FlowAIStagingCredential -Operation Rotate }
    'Delete' { Remove-FlowAIStagingCredential }
    'Status' { Get-FlowAIStagingCredentialStatus }
  }
  $result | ConvertTo-Json -Compress
} catch {
  $code = if ($_.Exception.Message -like 'FLOWAI_*') { $_.Exception.Message } else { 'FLOWAI_CREDENTIAL_OPERATION_FAILED' }
  [Console]::Error.WriteLine($code)
  exit 1
}
