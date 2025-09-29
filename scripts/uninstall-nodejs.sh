#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Node.js 卸载脚本（macOS）
# 完全移除通过官方PKG安装的Node.js
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

echo "========================================"
echo "Node.js 卸载程序"
echo "========================================"

# 检查是否为管理员权限
if [[ $EUID -ne 0 ]]; then
   echo_error "此脚本需要管理员权限运行。请使用 sudo 执行："
   echo "sudo $0"
   exit 1
fi

# 检查当前安装状态
echo_info "检查当前Node.js安装状态..."
if command -v node > /dev/null 2>&1; then
    CURRENT_NODE=$(node -v)
    echo_info "当前安装的Node.js版本: $CURRENT_NODE"
else
    echo_warn "系统中未检测到Node.js"
fi

if command -v npm > /dev/null 2>&1; then
    CURRENT_NPM=$(npm -v)
    echo_info "当前安装的npm版本: $CURRENT_NPM"
else
    echo_warn "系统中未检测到npm"
fi

echo ""
echo_warn "即将删除以下Node.js相关文件和目录："
echo "  - /usr/local/bin/node"
echo "  - /usr/local/bin/npm"
echo "  - /usr/local/bin/npx"
echo "  - /usr/local/lib/node_modules/"
echo "  - /usr/local/include/node/"
echo "  - /usr/local/share/man/man1/node.1"

read -p "确认要继续卸载吗？(y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo_info "已取消卸载操作"
    exit 0
fi

echo ""
echo_info "开始卸载Node.js..."

# 删除可执行文件
echo_info "删除可执行文件..."
[ -f /usr/local/bin/node ] && rm -f /usr/local/bin/node && echo "  ✓ 删除 /usr/local/bin/node"
[ -L /usr/local/bin/npm ] && rm -f /usr/local/bin/npm && echo "  ✓ 删除 /usr/local/bin/npm"
[ -L /usr/local/bin/npx ] && rm -f /usr/local/bin/npx && echo "  ✓ 删除 /usr/local/bin/npx"

# 删除 corepack（如果存在）
[ -L /usr/local/bin/corepack ] && rm -f /usr/local/bin/corepack && echo "  ✓ 删除 /usr/local/bin/corepack"

# 删除 node_modules 目录
echo_info "删除node_modules目录..."
if [ -d /usr/local/lib/node_modules ]; then
    rm -rf /usr/local/lib/node_modules
    echo "  ✓ 删除 /usr/local/lib/node_modules/"
fi

# 删除 include 目录
echo_info "删除include目录..."
if [ -d /usr/local/include/node ]; then
    rm -rf /usr/local/include/node
    echo "  ✓ 删除 /usr/local/include/node/"
fi

# 删除 man 页面
echo_info "删除手册页..."
[ -f /usr/local/share/man/man1/node.1 ] && rm -f /usr/local/share/man/man1/node.1 && echo "  ✓ 删除 /usr/local/share/man/man1/node.1"

# 删除可能的其他相关文件
echo_info "清理其他相关文件..."
[ -f /usr/local/share/doc/node ] && rm -rf /usr/local/share/doc/node && echo "  ✓ 删除 /usr/local/share/doc/node"
[ -f /usr/local/share/systemtap/tapset/node.stp ] && rm -f /usr/local/share/systemtap/tapset/node.stp && echo "  ✓ 删除 systemtap 相关文件"

echo ""
echo_success "Node.js 卸载完成！"

# 验证卸载结果
echo_info "验证卸载结果..."
if command -v node > /dev/null 2>&1; then
    echo_warn "警告: 系统中仍然检测到node命令，可能通过其他方式安装"
    echo "位置: $(which node)"
else
    echo_success "✓ node命令已成功移除"
fi

if command -v npm > /dev/null 2>&1; then
    echo_warn "警告: 系统中仍然检测到npm命令，可能通过其他方式安装"
    echo "位置: $(which npm)"
else
    echo_success "✓ npm命令已成功移除"
fi

echo ""
echo_info "建议重新打开终端或执行 'source ~/.zshrc' 来刷新环境变量"
echo_success "现在可以测试Node.js安装脚本了！"