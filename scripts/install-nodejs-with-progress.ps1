# ─────────────────────────────────────────────────────────────────────────────
# Node.js 安装脚本（Windows PowerShell，带进度输出，用于Electron集成）
# 输出JSON格式的进度信息，便于前端解析和显示
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# 进度输出函数
function Write-Progress-JSON {
    param(
        [string]$Step,
        [int]$Progress,
        [string]$Message,
        [string]$Status = "running"
    )
    $output = @{
        step = $Step
        progress = $Progress
        message = $Message
        status = $Status
    } | ConvertTo-Json -Compress
    Write-Output $output
}

function Write-Error-JSON {
    param([string]$Message)
    $output = @{
        step = "error"
        progress = 0
        message = $Message
        status = "error"
    } | ConvertTo-Json -Compress
    Write-Output $output
}

function Write-Success-JSON {
    param(
        [string]$Message,
        [string]$NodeVersion,
        [string]$NpmVersion
    )
    $output = @{
        step = "complete"
        progress = 100
        message = $Message
        status = "success"
        nodeVersion = $NodeVersion
        npmVersion = $NpmVersion
    } | ConvertTo-Json -Compress
    Write-Output $output
}

try {
    # 1) 检查管理员权限
    Write-Progress-JSON -Step "permission_check" -Progress 5 -Message "检查管理员权限"
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $IsAdmin) {
        Write-Error-JSON -Message "需要管理员权限运行此脚本"
        exit 1
    }

    # 2) 启用 TLS 1.2
    Write-Progress-JSON -Step "tls_setup" -Progress 10 -Message "配置网络安全协议"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    # 3) 检测 CPU 架构
    Write-Progress-JSON -Step "arch_detection" -Progress 15 -Message "检测系统架构"
    function Get-NodeCpu {
        try {
            $osArch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
            $cpuArchCode = (Get-CimInstance Win32_Processor).Architecture
        } catch {
            $osArch = (Get-WmiObject Win32_OperatingSystem).OSArchitecture
            $cpuArchCode = (Get-WmiObject Win32_Processor).Architecture
        }
        if ($osArch -notmatch '64') { return 'x86' }
        if ($cpuArchCode -eq 5 -or $env:PROCESSOR_ARCHITECTURE -match 'ARM64') { return 'arm64' }
        return 'x64'
    }
    $cpu = Get-NodeCpu

    # 4) 获取最新版本信息
    Write-Progress-JSON -Step "version_fetch" -Progress 20 -Message "获取最新Node.js版本信息"
    $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing

    # 优先选择LTS版本
    $lts = $index | Where-Object { $_.lts } | Sort-Object { [version]($_.version.TrimStart('v')) } -Descending | Select-Object -First 1
    if ($lts) {
        $ver = $lts.version.TrimStart('v')
        $useVersion = $lts.version
        Write-Progress-JSON -Step "version_selected" -Progress 25 -Message "选择LTS版本: $useVersion"
    } else {
        $latest = $index[0]
        $ver = $latest.version.TrimStart('v')
        $useVersion = $latest.version
        Write-Progress-JSON -Step "version_selected" -Progress 25 -Message "选择最新版本: $useVersion"
    }

    $baseUrl = "https://nodejs.org/dist/$useVersion/"
    $msiName = "node-$useVersion-$cpu.msi"

    # 5) 创建临时目录
    Write-Progress-JSON -Step "temp_setup" -Progress 30 -Message "创建临时工作目录"
    $work = Join-Path $env:TEMP "node-install-$([guid]::NewGuid())"
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $msiPath = Join-Path $work $msiName
    $shaPath = Join-Path $work "SHASUMS256.txt"

    # 6) 下载安装包
    Write-Progress-JSON -Step "download_start" -Progress 35 -Message "下载安装包: $msiName"
    Invoke-WebRequest ($baseUrl + $msiName) -OutFile $msiPath
    Write-Progress-JSON -Step "download_complete" -Progress 60 -Message "安装包下载完成"

    # 7) 下载校验文件
    Write-Progress-JSON -Step "checksum_download" -Progress 65 -Message "下载校验文件"
    Invoke-WebRequest ($baseUrl + 'SHASUMS256.txt') -OutFile $shaPath

    # 8) 校验 SHA256
    Write-Progress-JSON -Step "checksum_verify" -Progress 70 -Message "校验文件完整性"
    $match = Select-String -Path $shaPath -Pattern ([regex]::Escape($msiName)) | Select-Object -First 1
    if (-not $match) {
        Write-Error-JSON -Message "未找到安装包的校验信息"
        exit 1
    }
    $expected = ($match.Line -split '\s+')[0].ToLower()
    $actual = (Get-FileHash -Algorithm SHA256 -Path $msiPath).Hash.ToLower()
    if ($expected -ne $actual) {
        Write-Error-JSON -Message "文件校验失败，安装包可能已损坏"
        exit 1
    }
    Write-Progress-JSON -Step "checksum_ok" -Progress 75 -Message "文件校验通过"

    # 9) 静默安装
    Write-Progress-JSON -Step "install_start" -Progress 80 -Message "开始安装Node.js"
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait -NoNewWindow
    Write-Progress-JSON -Step "install_complete" -Progress 90 -Message "Node.js安装完成"

    # 10) 刷新 PATH
    Write-Progress-JSON -Step "path_refresh" -Progress 95 -Message "更新环境变量"
    $machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
    $userPath    = [Environment]::GetEnvironmentVariable('Path','User')
    $env:Path = ($machinePath, $userPath -ne $null) -join ';'

    # 11) 启用 Corepack（可选）
    try { corepack enable | Out-Null } catch { }

    # 12) 验证安装
    Write-Progress-JSON -Step "verify" -Progress 98 -Message "验证安装结果"
    $nodeV = (& node -v) 2>$null
    $npmV  = (& npm -v) 2>$null

    if (-not $nodeV) {
        Write-Error-JSON -Message "安装完成但未能识别到node命令"
        exit 1
    }

    # 13) 输出成功结果
    Write-Success-JSON -Message "Node.js安装成功" -NodeVersion $nodeV -NpmVersion $npmV

} catch {
    Write-Error-JSON -Message "安装过程中发生错误: $($_.Exception.Message)"

    # 回退方案：尝试使用 winget
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Progress-JSON -Step "fallback_winget" -Progress 50 -Message "尝试使用winget安装"
        try {
            winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
            $machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
            $userPath    = [Environment]::GetEnvironmentVariable('Path','User')
            $env:Path = ($machinePath, $userPath -ne $null) -join ';'
            $nodeV = (& node -v) 2>$null
            $npmV  = (& npm -v) 2>$null
            if ($nodeV) {
                Write-Success-JSON -Message "使用winget安装成功" -NodeVersion $nodeV -NpmVersion $npmV
            } else {
                Write-Error-JSON -Message "winget安装失败"
            }
        } catch {
            Write-Error-JSON -Message "winget安装失败: $($_.Exception.Message)"
        }
    } else {
        Write-Error-JSON -Message "系统不支持winget，请手动安装Node.js"
    }
} finally {
    # 14) 清理临时文件
    if ($work -and (Test-Path $work)) {
        try { Remove-Item -Recurse -Force $work } catch { }
    }
}