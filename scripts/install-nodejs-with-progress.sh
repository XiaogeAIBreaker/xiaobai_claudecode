#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Node.js 安装脚本（带进度输出，用于Electron集成）
# 输出JSON格式的进度信息，便于前端解析和显示
# ─────────────────────────────────────────────────────────────────────────────

set -e

# 进度输出函数
output_progress() {
    local step="$1"
    local progress="$2"
    local message="$3"
    local status="${4:-running}"
    echo "{\"step\":\"$step\",\"progress\":$progress,\"message\":\"$message\",\"status\":\"$status\"}"
}

output_error() {
    local message="$1"
    echo "{\"step\":\"error\",\"progress\":0,\"message\":\"$message\",\"status\":\"error\"}"
}

output_success() {
    local message="$1"
    local node_version="$2"
    local npm_version="$3"
    echo "{\"step\":\"complete\",\"progress\":100,\"message\":\"$message\",\"status\":\"success\",\"nodeVersion\":\"$node_version\",\"npmVersion\":\"$npm_version\"}"
}

# 1) 检查管理员权限
output_progress "permission_check" 5 "检查管理员权限"
if [[ $EUID -ne 0 ]]; then
   output_error "需要管理员权限运行此脚本"
   exit 1
fi

# 2) 检测系统架构
output_progress "arch_detection" 10 "检测系统架构"
ARCH=$(uname -m)
case $ARCH in
    x86_64) NODE_ARCH="x64" ;;
    arm64) NODE_ARCH="arm64" ;;
    *)
        output_error "不支持的系统架构: $ARCH"
        exit 1
        ;;
esac

# 3) 获取最新版本信息
output_progress "version_fetch" 20 "获取最新Node.js版本信息"
if command -v python3 > /dev/null 2>&1; then
    VERSION_INFO=$(curl -s https://nodejs.org/dist/index.json | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    latest = data[0]['version']
    lts = next((item for item in data if item.get('lts')), None)
    lts_version = lts['version'] if lts else ''
    print(f'{latest}|{lts_version}')
except Exception as e:
    print('|')
")
    LATEST_VERSION=$(echo "$VERSION_INFO" | cut -d'|' -f1)
    LTS_VERSION=$(echo "$VERSION_INFO" | cut -d'|' -f2)
else
    output_error "需要Python3来解析版本信息"
    exit 1
fi

if [[ -z "$LATEST_VERSION" ]]; then
    output_error "无法获取Node.js版本信息"
    exit 1
fi

# 优先使用LTS版本
if [[ -n "$LTS_VERSION" ]]; then
    USE_VERSION="$LTS_VERSION"
    output_progress "version_selected" 25 "选择LTS版本: $LTS_VERSION"
else
    USE_VERSION="$LATEST_VERSION"
    output_progress "version_selected" 25 "选择最新版本: $LATEST_VERSION"
fi

VERSION=${USE_VERSION#v}
PKG_FILE="node-$USE_VERSION.pkg"
BASE_URL="https://nodejs.org/dist/$USE_VERSION/"

# 4) 创建临时目录
output_progress "temp_setup" 30 "创建临时工作目录"
WORK_DIR="/tmp/node-install-$(date +%s)"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 5) 下载安装包
output_progress "download_start" 35 "开始下载: $PKG_FILE"
if ! curl -L "$BASE_URL$PKG_FILE" -o "$PKG_FILE" --progress-bar 2>/dev/null; then
    output_error "下载安装包失败"
    exit 1
fi
output_progress "download_complete" 60 "安装包下载完成"

# 6) 下载校验文件
output_progress "checksum_download" 65 "下载校验文件"
if ! curl -s -L "${BASE_URL}SHASUMS256.txt" -o "SHASUMS256.txt"; then
    output_error "下载校验文件失败"
    exit 1
fi

# 7) 校验文件完整性
output_progress "checksum_verify" 70 "校验文件完整性"
EXPECTED_SHA=$(grep "$PKG_FILE" SHASUMS256.txt | awk '{print $1}')
if [[ -z "$EXPECTED_SHA" ]]; then
    output_error "未找到安装包的校验信息"
    exit 1
fi

ACTUAL_SHA=$(shasum -a 256 "$PKG_FILE" | awk '{print $1}')
if [[ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]]; then
    output_error "文件校验失败，安装包可能已损坏"
    exit 1
fi
output_progress "checksum_ok" 75 "文件校验通过"

# 8) 执行安装
output_progress "install_start" 80 "开始安装Node.js"
if ! installer -pkg "$PKG_FILE" -target / >/dev/null 2>&1; then
    output_error "Node.js安装失败"
    exit 1
fi
output_progress "install_complete" 90 "Node.js安装完成"

# 9) 验证安装
output_progress "verify" 95 "验证安装结果"
export PATH="/usr/local/bin:$PATH"

NODE_VERSION=$(node -v 2>/dev/null || echo "")
NPM_VERSION=$(npm -v 2>/dev/null || echo "")

if [[ -z "$NODE_VERSION" ]]; then
    output_error "安装完成但未能识别到node命令"
    exit 1
fi

# 10) 清理临时文件
cd /
rm -rf "$WORK_DIR"

# 11) 输出成功结果
output_success "Node.js安装成功" "$NODE_VERSION" "$NPM_VERSION"