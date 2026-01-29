#!/usr/bin/env powershell
<#
  Quick Vercel Environment Setup Assistant
  This script helps you understand what needs to be done in Vercel
  Run this to get a summary of required environment variables
#>

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
Write-Host "VERCEL ENVIRONMENT VARIABLES SETUP" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan

Write-Host "`n⚠️  ISSUE: Production deployment failing - missing environment variables`n" -ForegroundColor Yellow
Write-Host "ERROR: 'SNOWFLAKE_ACCOUNT environment variable not set'" -ForegroundColor Red

Write-Host "`n✅ SOLUTION: Add 5 environment variables to Vercel dashboard`n" -ForegroundColor Green

Write-Host "📋 REQUIRED VARIABLES:`n" -ForegroundColor Cyan

$vars = @(
    @{Name="SNOWFLAKE_ACCOUNT"; Value="A3615210430571-BM71673"; Desc="Snowflake account ID"},
    @{Name="SNOWFLAKE_USER"; Value="ali"; Desc="Snowflake user"},
    @{Name="SNOWFLAKE_ROLE"; Value="ACCOUNTADMIN"; Desc="Snowflake role"},
    @{Name="SNOWFLAKE_RSA_PASSPHRASE"; Value="[leave blank]"; Desc="RSA key passphrase"},
    @{Name="SNOWFLAKE_PRIVATE_KEY_BASE64"; Value="[see base64 file]"; Desc="Base64-encoded RSA key"}
)

for ($i = 0; $i -lt $vars.Count; $i++) {
    $var = $vars[$i]
    $index = $i + 1
    Write-Host "  $index. $($var.Name)" -ForegroundColor White
    Write-Host "     └─ Value: $($var.Value)" -ForegroundColor Gray
    Write-Host "     └─ Purpose: $($var.Desc)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "`n🔧 HOW TO SET THEM:`n" -ForegroundColor Cyan
Write-Host "  1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "  2. Click: mim-react project" -ForegroundColor White
Write-Host "  3. Click: Settings tab (top right)" -ForegroundColor White
Write-Host "  4. Click: Environment Variables (left sidebar)" -ForegroundColor White
Write-Host "  5. Add each variable above" -ForegroundColor White
Write-Host "     - Select: Production, Preview, Development" -ForegroundColor Gray
Write-Host "  6. Click: Redeploy" -ForegroundColor White
Write-Host ""

Write-Host "📄 BASE64 KEY LOCATION:" -ForegroundColor Cyan
Write-Host "  File: rsa_key.p8.base64 (in code directory)" -ForegroundColor Gray
Write-Host "  Size: ~2000 characters" -ForegroundColor Gray
Write-Host "  Use: Copy entire contents for SNOWFLAKE_PRIVATE_KEY_BASE64" -ForegroundColor Gray
Write-Host ""

Write-Host "⏱️  ESTIMATED TIME: 5-6 minutes`n" -ForegroundColor Green
Write-Host "  1. Add variables (2 min)" -ForegroundColor Gray
Write-Host "  2. Redeploy (1-2 min)" -ForegroundColor Gray
Write-Host "  3. Test (1-2 min)" -ForegroundColor Gray
Write-Host ""

Write-Host ("="*70) -ForegroundColor Cyan
Write-Host "For detailed instructions, see: VERCEL_ENV_SETUP.md" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan
Write-Host ""
