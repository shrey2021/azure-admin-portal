# GitHub Deployment Helper for shrey2021
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Deploying Azure Admin Portal to GitHub (shrey2021)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check if authenticated with GitHub CLI
$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[*] You are not logged into GitHub CLI yet." -ForegroundColor Yellow
    Write-Host "[*] Launching GitHub CLI login (select 'Login with a web browser')...`n" -ForegroundColor Yellow
    gh auth login -h github.com -p https -w
}

# Create repository under shrey2021 and push
Write-Host "`n[*] Creating and pushing repository to https://github.com/shrey2021/azure-admin-portal ..." -ForegroundColor Green
gh repo create shrey2021/azure-admin-portal --public --source=. --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Project successfully deployed to GitHub:" -ForegroundColor Green
    Write-Host " 👉 https://github.com/shrey2021/azure-admin-portal" -ForegroundColor Cyan
    Write-Host "`n[*] Next step: Deploy to Vercel at https://vercel.com/new" -ForegroundColor Yellow
    Start-Process "https://vercel.com/new"
} else {
    Write-Host "`n[!] Notice: If the repo already exists on GitHub, pushing directly..." -ForegroundColor Yellow
    git push -u origin main
}
