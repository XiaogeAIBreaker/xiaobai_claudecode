#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# 测试带进度输出的脚本（干跑模式，不实际安装）
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

echo "=== 测试进度输出格式 ==="
echo ""

# 模拟安装流程的进度输出
output_progress "permission_check" 5 "检查管理员权限"
sleep 0.5

output_progress "arch_detection" 10 "检测系统架构"
sleep 0.3

output_progress "version_fetch" 20 "获取最新Node.js版本信息"
sleep 1

# 实际获取版本信息来测试
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

    if [[ -n "$LTS_VERSION" ]]; then
        USE_VERSION="$LTS_VERSION"
        output_progress "version_selected" 25 "选择LTS版本: $LTS_VERSION"
    else
        USE_VERSION="$LATEST_VERSION"
        output_progress "version_selected" 25 "选择最新版本: $LATEST_VERSION"
    fi

    PKG_FILE="node-$USE_VERSION.pkg"
else
    USE_VERSION="v22.20.0"
    PKG_FILE="node-v22.20.0.pkg"
    output_progress "version_selected" 25 "选择版本: $USE_VERSION"
fi

sleep 0.3

output_progress "temp_setup" 30 "创建临时工作目录"
sleep 0.2

output_progress "download_start" 35 "开始下载: $PKG_FILE"
sleep 1

# 模拟下载进度
for i in {40..59}; do
    output_progress "downloading" $i "下载中... ${i}%"
    sleep 0.1
done

output_progress "download_complete" 60 "安装包下载完成"
sleep 0.3

output_progress "checksum_download" 65 "下载校验文件"
sleep 0.3

output_progress "checksum_verify" 70 "校验文件完整性"
sleep 0.5

output_progress "checksum_ok" 75 "文件校验通过"
sleep 0.3

output_progress "install_start" 80 "开始安装Node.js"
sleep 1

output_progress "install_complete" 90 "Node.js安装完成"
sleep 0.3

output_progress "verify" 95 "验证安装结果"
sleep 0.5

# 使用当前系统的实际版本
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
else
    NODE_VERSION="v22.20.0"
    NPM_VERSION="10.8.2"
fi

output_success "Node.js安装成功" "$NODE_VERSION" "$NPM_VERSION"

echo ""
echo "=== 进度输出测试完成 ==="