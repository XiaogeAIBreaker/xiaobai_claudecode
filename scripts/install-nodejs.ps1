# ─────────────────────────────────────────────────────────────────────────────
# Node.js 最新稳定（LTS）版一键安装脚本（Windows PowerShell）
# 适合零基础：检测架构 → 获取最新LTS → 校验SHA256 → 静默安装 → 刷新PATH → 验证
# 如官方源下载失败且系统支持，自动回退使用 winget 安装 LTS。
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# 1) 必须管理员权限
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  Write-Error "请以"管理员"身份运行 PowerShell 后再执行本脚本。"
  exit 1
}

# 2) 强制启用 TLS 1.2（兼容老系统）
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 3) 探测 CPU 架构：x64 / arm64 / x86
function Get-NodeCpu {
  try {
    $osArch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
    $cpuArchCode = (Get-CimInstance Win32_Processor).Architecture # 5=ARM, 9/12=AMD64/ARM64 视系统而定
  } catch {
    $osArch = (Get-WmiObject Win32_OperatingSystem).OSArchitecture
    $cpuArchCode = (Get-WmiObject Win32_Processor).Architecture
  }
  if ($osArch -notmatch '64') { return 'x86' }
  if ($cpuArchCode -eq 5 -or $env:PROCESSOR_ARCHITECTURE -match 'ARM64') { return 'arm64' }
  return 'x64'
}
$cpu = Get-NodeCpu

# 4) 获取最新 LTS 版本信息
try {
  $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
  $lts = $index |
    Where-Object { $_.lts } |
    Sort-Object { [version]($_.version.TrimStart('v')) } -Descending |
    Select-Object -First 1
  if (-not $lts) { throw "未获取到 LTS 版本信息。" }
  $ver = $lts.version.TrimStart('v')
  $baseUrl = "https://nodejs.org/dist/v$ver/"
  $msiName = "node-v$ver-$cpu.msi"

  # 5) 下载 MSI 与 SHA 列表到临时目录
  $work = Join-Path $env:TEMP "node-install-$([guid]::NewGuid())"
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $msiPath = Join-Path $work $msiName
  $shaPath = Join-Path $work "SHASUMS256.txt"

  Write-Host "→ 检测到最新 LTS：v$ver ($cpu)"
  Write-Host "→ 正在下载：$msiName"
  Invoke-WebRequest ($baseUrl + $msiName) -OutFile $msiPath
  Invoke-WebRequest ($baseUrl + 'SHASUMS256.txt') -OutFile $shaPath

  # 6) 校验 SHA256
  $match = Select-String -Path $shaPath -Pattern ([regex]::Escape($msiName)) | Select-Object -First 1
  if (-not $match) { throw "未在 SHASUMS256.txt 中找到 $msiName 的校验信息。" }
  $expected = ($match.Line -split '\s+')[0].ToLower()
  $actual = (Get-FileHash -Algorithm SHA256 -Path $msiPath).Hash.ToLower()
  if ($expected -ne $actual) {
    throw "SHA256 校验失败！期望 $expected，实际 $actual"
  }

  # 7) 静默安装
  Write-Host "→ 正在静默安装 Node.js v$ver ($cpu)..."
  Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait -NoNewWindow

  # 8) 刷新当前会话 PATH（无需重启窗口即可用）
  $machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
  $userPath    = [Environment]::GetEnvironmentVariable('Path','User')
  $env:Path = ($machinePath, $userPath -ne $null) -join ';'

  # 9) （可选）启用 Corepack（便于使用 pnpm/yarn）
  try { corepack enable | Out-Null } catch { }

  # 10) 验证
  $nodeV = (& node -v) 2>$null
  $npmV  = (& npm -v) 2>$null
  if (-not $nodeV) { throw "安装完成但当前会话未识别到 node。请新开一个终端再试。" }

  Write-Host "✅ 安装成功！"
  Write-Host "   Node 版本：" $nodeV
  Write-Host "   npm  版本：" $npmV
}
catch {
  Write-Warning "从官方源安装失败：$($_.Exception.Message)"
  # 11) 回退方案：使用 winget 安装 LTS（如系统支持）
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "→ 尝试使用 winget 安装：OpenJS.NodeJS.LTS"
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    $machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
    $userPath    = [Environment]::GetEnvironmentVariable('Path','User')
    $env:Path = ($machinePath, $userPath -ne $null) -join ';'
    $nodeV = (& node -v) 2>$null
    $npmV  = (& npm -v) 2>$null
    if ($nodeV) {
      Write-Host "✅ winget 安装完成。"
      Write-Host "   Node 版本：" $nodeV
      Write-Host "   npm  版本：" $npmV
    } else {
      throw "winget 安装后仍未检测到 node。"
    }
  } else {
    throw "系统无 winget 或不可用，请检查网络或改用离线安装包。"
  }
}
finally {
  # 12) 清理临时文件夹（若存在）
  if ($work -and (Test-Path $work)) {
    try { Remove-Item -Recurse -Force $work } catch { }
  }
}