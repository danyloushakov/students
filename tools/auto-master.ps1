# Автооновлення загального арту (урок 11, New Era). Запускає ВИКЛАДАЧ на своєму ПК під час уроку.
#
# Кожні 20 с:
#   1. забирає push-і учнів з GitHub;
#   2. MASTER.psd, master-assets, index.html, style.css і tools завжди лишаються ТВОЇМИ
#      (якщо учень випадково закомітив MASTER.psd чи PNG — це відкочується);
#   3. якщо змінився чийсь students/*.psb — Photoshop рендерить master-assets/MASTER.png;
#   4. commit + push. Сайт («Результат команди») оновлюється сам.
#
# Запуск: подвійний клік на tools/auto-master.cmd. Зупинити: закрити вікно або Ctrl+C.

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$jsx = Join-Path $PSScriptRoot 'auto-master.jsx'
$log = Join-Path $env:TEMP 'newera-auto-master.log'
$protected = @('MASTER.psd', 'master-assets', 'index.html', 'style.css', 'tools', '.gitignore', '.gitattributes', 'README.md')
$interval = 20

$ps = Get-ChildItem 'C:\Program Files\Adobe' -Filter Photoshop.exe -Recurse -Depth 2 -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $ps) { Write-Host 'Не знайшов Photoshop.exe у C:\Program Files\Adobe' -ForegroundColor Red; Read-Host 'Enter — вийти'; exit 1 }

function Say($text, $color = 'Gray') { Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $text) -ForegroundColor $color }

function Render-Master {
  Remove-Item $log -ErrorAction SilentlyContinue
  Start-Process -FilePath $ps -ArgumentList "`"$jsx`""
  for ($i = 0; $i -lt 120; $i++) {
    if (Test-Path $log) { return (Get-Content $log -Raw) }
    Start-Sleep -Seconds 1
  }
  return 'timeout'
}

function Commit-Mine($message) {
  git add -A -- $protected 2>$null
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { git commit -q -m $message; return $true }
  return $false
}

Say "Автооновлення MASTER.png запущено. Тека: $root" 'Cyan'
Say 'Не закривай це вікно до кінця уроку.' 'Cyan'
$force = $true  # перший прохід — завжди рендеримо

while ($true) {
  # Свої локальні зміни (наприклад, ти поправив MASTER.psd) — спершу в commit.
  [void](Commit-Mine 'teacher: update')

  git fetch -q origin 2>$null
  $before = (git rev-parse HEAD).Trim()
  $remote = (git rev-parse origin/main).Trim()
  $base = (git merge-base HEAD origin/main).Trim()
  $changedStudents = $false

  if ($base -ne $remote) {
    # Є нові commit-и учнів. Конфлікти — на нашу користь (-X ours).
    git merge -q --no-edit -X ours origin/main 2>$null
    if ($LASTEXITCODE -ne 0) {
      git merge --abort 2>$null
      Say 'Не вдалося злити зміни учнів (див. Sourcetree). Спробую ще раз.' 'Yellow'
      Start-Sleep -Seconds $interval; continue
    }
    # Учні не змінюють MASTER і ассети — повертаємо наші версії.
    foreach ($p in $protected) {
      if (git ls-tree --name-only $before -- $p) { git checkout $before -- $p 2>$null }
    }
    $files = git diff --name-only $before HEAD -- students
    if ($files) {
      $changedStudents = $true
      $who = ($files | ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_) }) -join ', '
      Say "Нові зміни: $who" 'Green'
    }
  }

  if ($changedStudents -or $force) {
    $r = Render-Master
    if ($r -like 'ok*') { Say 'MASTER.png оновлено' } else { Say "Photoshop: $r" 'Yellow' }
    $force = $false
  }

  [void](Commit-Mine 'auto: MASTER preview')

  $ahead = [int](git rev-list --count origin/main..HEAD)
  if ($ahead -gt 0) {
    git push -q origin HEAD:main 2>$null
    if ($LASTEXITCODE -eq 0) { Say 'Push — сайт оновиться за ~15 с' 'Green' }
    else { Say 'Push не пройшов (хтось запушив раніше) — повторю' 'Yellow' }
  }

  Start-Sleep -Seconds $interval
}
