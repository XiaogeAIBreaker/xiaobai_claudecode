#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Node.js 最新稳定版一键安装脚本（macOS）
# 适合零基础：检测架构 → 获取最新稳定版 → 校验SHA256 → 静默安装 → 验证
# ─────────────────────────────────────────────────────────────────────────────

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}→${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo_error() {
    echo -e "${RED}✗${NC} $1"
}

echo_success() {
    echo -e "${GREEN}✅${NC} $1"
}

# 1) 检查是否为管理员权限
if [[ $EUID -ne 0 ]]; then
   echo_error "此脚本需要管理员权限运行。请使用 sudo 执行："
   echo "sudo $0"
   exit 1
fi

# 2) 检测 CPU 架构
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        NODE_ARCH="x64"
        ;;
    arm64)
        NODE_ARCH="arm64"
        ;;
    *)
        echo_error "不支持的架构: $ARCH"
        exit 1
        ;;
esac

# 3) 获取最新稳定版本信息
echo_info "正在获取最新 Node.js 版本信息..."
LATEST_VERSION=$(curl -s https://nodejs.org/dist/index.json | grep -o '"version":"[^"]*' | grep -o 'v[^"]*' | head -1)

if [[ -z "$LATEST_VERSION" ]]; then
    echo_error "无法获取最新版本信息"
    exit 1
fi

VERSION=${LATEST_VERSION#v}  # 移除 'v' 前缀
# macOS PKG文件是通用格式，不分架构
PKG_FILE="node-$LATEST_VERSION.pkg"
BASE_URL="https://nodejs.org/dist/$LATEST_VERSION/"

echo_info "检测到最新版本：$LATEST_VERSION ($NODE_ARCH)"

# 4) 创建临时目录
WORK_DIR="/tmp/node-install-$(date +%s)"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 5) 下载安装包和校验文件
echo_info "正在下载：$PKG_FILE"
if ! curl -L "$BASE_URL$PKG_FILE" -o "$PKG_FILE"; then
    echo_error "下载 $PKG_FILE 失败"
    exit 1
fi

echo_info "正在下载校验文件..."
if ! curl -L "${BASE_URL}SHASUMS256.txt" -o "SHASUMS256.txt"; then
    echo_error "下载校验文件失败"
    exit 1
fi

# 6) 校验 SHA256
echo_info "正在校验文件完整性..."
EXPECTED_SHA=$(grep "$PKG_FILE" SHASUMS256.txt | awk '{print $1}')
if [[ -z "$EXPECTED_SHA" ]]; then
    echo_error "未找到 $PKG_FILE 的校验信息"
    exit 1
fi

ACTUAL_SHA=$(shasum -a 256 "$PKG_FILE" | awk '{print $1}')
if [[ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]]; then
    echo_error "SHA256 校验失败！"
    echo "期望: $EXPECTED_SHA"
    echo "实际: $ACTUAL_SHA"
    exit 1
fi

echo_info "文件校验通过"

# 7) 静默安装
echo_info "正在安装 Node.js $LATEST_VERSION ($NODE_ARCH)..."
if ! installer -pkg "$PKG_FILE" -target /; then
    echo_error "安装失败"
    exit 1
fi

# 8) 验证安装
echo_info "正在验证安装..."

# 更新当前 shell 的 PATH
export PATH="/usr/local/bin:$PATH"

# 检查 node 和 npm
NODE_VERSION=$(node -v 2>/dev/null || echo "")
NPM_VERSION=$(npm -v 2>/dev/null || echo "")

if [[ -z "$NODE_VERSION" ]]; then
    echo_error "安装完成但未能识别到 node 命令"
    exit 1
fi

if [[ -z "$NPM_VERSION" ]]; then
    echo_warn "Node.js 安装成功但 npm 不可用"
else
    echo_success "安装成功！"
    echo "   Node 版本：$NODE_VERSION"
    echo "   npm 版本：$NPM_VERSION"
fi

# 9) 清理临时文件
cd /
rm -rf "$WORK_DIR"

echo_success "Node.js 安装完成！"
echo_info "请重新打开终端或执行 'source ~/.zshrc' 来更新环境变量"