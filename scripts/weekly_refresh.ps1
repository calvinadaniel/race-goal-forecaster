$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$python   = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "C:\Python310\python.exe" }

Set-Location "$repoRoot\scripts"
& $python fetch_strava.py
& $python process.py
& $python project.py

Set-Location $repoRoot
git add "data/activities.json" `
        "data/monthly.json" `
        "data/weekly.json" `
        "data/projections.json"

$staged = git diff --cached --name-only
if ($staged) {
    git commit -m "chore: weekly Strava data refresh ($(Get-Date -Format yyyy-MM-dd))"
    git push
} else {
    Write-Output "No data changes, skipping commit."
}
