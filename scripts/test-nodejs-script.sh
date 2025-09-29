#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Node.js 安装脚本测试工具
# 用于验证安装脚本的各个功能点，不实际执行安装
# ─────────────────────────────────────────────────────────────────────────────

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo_test() {
    echo -e "${BLUE}🧪${NC} 测试: $1"
}

echo "========================================"
echo "Node.js 安装脚本功能测试"
echo "========================================"

# 1) 测试架构检测
echo_test "检测系统架构"
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        NODE_ARCH="x64"
        echo_success "架构检测成功: $ARCH -> $NODE_ARCH"
        ;;
    arm64)
        NODE_ARCH="arm64"
        echo_success "架构检测成功: $ARCH -> $NODE_ARCH"
        ;;
    *)
        echo_error "不支持的架构: $ARCH"
        ;;
esac

# 2) 测试网络连接和API访问
echo_test "测试网络连接到 nodejs.org"
if curl -s --connect-timeout 10 https://nodejs.org > /dev/null; then
    echo_success "网络连接正常"
else
    echo_error "无法连接到 nodejs.org"
    exit 1
fi

# 3) 测试获取版本信息
echo_test "获取最新 Node.js 版本信息"

# 检查是否有Python3可用
if command -v python3 > /dev/null 2>&1; then
    # 使用Python解析JSON（更可靠）
    VERSION_INFO=$(curl -s https://nodejs.org/dist/index.json | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    latest = data[0]['version']
    lts = next((item for item in data if item.get('lts')), None)
    lts_version = lts['version'] if lts else ''
    print(f'{latest}|{lts_version}')
except:
    print('|')
")
    LATEST_VERSION=$(echo "$VERSION_INFO" | cut -d'|' -f1)
    LTS_VERSION=$(echo "$VERSION_INFO" | cut -d'|' -f2)
else
    # 回退到sed解析（不太可靠，但作为备用）
    echo_warn "Python3 不可用，使用备用解析方法"
    LATEST_VERSION=$(curl -s https://nodejs.org/dist/index.json | head -2 | tail -1 | sed 's/.*"version":"\([^"]*\)".*/\1/')
    LTS_VERSION=""
fi

if [[ -n "$LATEST_VERSION" ]]; then
    echo_success "最新版本: $LATEST_VERSION"
    if [[ -n "$LTS_VERSION" ]]; then
        echo_info "最新LTS版本: $LTS_VERSION"
        # 使用LTS版本进行测试
        USE_VERSION="$LTS_VERSION"
    else
        # 如果没有LTS，使用最新版本
        USE_VERSION="$LATEST_VERSION"
    fi

    VERSION=${USE_VERSION#v}
    # macOS PKG文件是通用格式，不分架构
    PKG_FILE="node-$USE_VERSION.pkg"
    echo_info "测试使用版本: $USE_VERSION"
    echo_info "对应安装包: $PKG_FILE"
else
    echo_error "无法获取版本信息"
    exit 1
fi

# 4) 测试下载链接可用性
echo_test "验证下载链接可用性"
BASE_URL="https://nodejs.org/dist/$USE_VERSION/"
DOWNLOAD_URL="$BASE_URL$PKG_FILE"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOWNLOAD_URL")
if [[ "$HTTP_STATUS" == "200" ]]; then
    echo_success "下载链接可用: $DOWNLOAD_URL (状态码: $HTTP_STATUS)"
else
    echo_error "下载链接不可用: $DOWNLOAD_URL (状态码: $HTTP_STATUS)"
fi

# 5) 测试校验文件可用性
echo_test "验证校验文件可用性"
SHASUMS_URL="${BASE_URL}SHASUMS256.txt"

SHA_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SHASUMS_URL")
if [[ "$SHA_HTTP_STATUS" == "200" ]]; then
    echo_success "校验文件可用: $SHASUMS_URL (状态码: $SHA_HTTP_STATUS)"

    # 下载校验文件并检查是否包含我们的安装包
    echo_test "检查校验文件内容"
    SHASUMS_CONTENT=$(curl -s "$SHASUMS_URL")
    if echo "$SHASUMS_CONTENT" | grep -q "$PKG_FILE"; then
        echo_success "校验文件包含安装包信息"
        EXPECTED_SHA=$(echo "$SHASUMS_CONTENT" | grep "$PKG_FILE" | awk '{print $1}')
        echo_info "期望 SHA256: $EXPECTED_SHA"
    else
        echo_error "校验文件不包含安装包信息"
    fi
else
    echo_error "校验文件不可用: $SHASUMS_URL (状态码: $SHA_HTTP_STATUS)"
fi

# 6) 测试当前系统的 Node.js 状态
echo_test "检查当前系统的 Node.js 状态"
if command -v node > /dev/null 2>&1; then
    CURRENT_NODE=$(node -v)
    echo_info "当前已安装 Node.js: $CURRENT_NODE"

    if command -v npm > /dev/null 2>&1; then
        CURRENT_NPM=$(npm -v)
        echo_info "当前已安装 npm: $CURRENT_NPM"
    else
        echo_warn "Node.js 已安装但 npm 不可用"
    fi
else
    echo_info "当前系统未安装 Node.js"
fi

# 7) 检查系统工具可用性
echo_test "检查系统工具可用性"
REQUIRED_TOOLS=("curl" "shasum" "installer")
for tool in "${REQUIRED_TOOLS[@]}"; do
    if command -v "$tool" > /dev/null 2>&1; then
        echo_success "$tool 可用"
    else
        echo_error "$tool 不可用"
    fi
done

# 8) 检查权限要求
echo_test "检查当前用户权限"
if [[ $EUID -eq 0 ]]; then
    echo_success "当前以管理员权限运行"
else
    echo_warn "当前非管理员权限，实际安装时需要 sudo"
fi

echo "========================================"
echo_success "脚本功能测试完成"
echo "========================================"

# 输出总结信息
echo ""
echo "📋 测试总结:"
echo "- 系统架构: $ARCH ($NODE_ARCH)"
echo "- 最新版本: $LATEST_VERSION"
if [[ -n "$LTS_VERSION" ]]; then
    echo "- 最新LTS版本: $LTS_VERSION"
fi
echo "- 测试版本: $USE_VERSION"
echo "- 安装包名: $PKG_FILE"
echo "- 下载地址: $DOWNLOAD_URL"
echo ""
echo "✨ 如果所有测试都通过，说明安装脚本具备运行条件。"