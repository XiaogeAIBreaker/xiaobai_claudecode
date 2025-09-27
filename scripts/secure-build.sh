#!/bin/bash

# Claude Code CLI 安装程序安全构建脚本
# 确保构建过程符合安全标准

set -e  # 遇到错误立即退出

echo "🔒 Claude Installer 安全构建流程"
echo "=================================="

# 1. 环境检查
echo "🔍 1. 检查构建环境..."

# 检查Node.js版本
NODE_VERSION=$(node --version)
echo "Node.js版本: $NODE_VERSION"

# 检查npm版本
NPM_VERSION=$(npm --version)
echo "npm版本: $NPM_VERSION"

# 检查是否在CI环境
if [ "$CI" = "true" ]; then
    echo "✅ CI环境检测"
else
    echo "⚠️ 本地构建环境"
fi

# 2. 清理构建环境
echo ""
echo "🧹 2. 清理构建环境..."
rm -rf node_modules dist build
echo "✅ 环境清理完成"

# 3. 安装依赖
echo ""
echo "📦 3. 安装构建依赖..."
npm ci --silent
echo "✅ 依赖安装完成"

# 4. 安全审计
echo ""
echo "🔍 4. 运行安全审计..."

# npm安全审计
echo "运行npm audit..."
if npm audit --audit-level=moderate; then
    echo "✅ npm安全审计通过"
else
    echo "⚠️ npm安全审计发现问题，请检查"
    echo "可以运行 'npm audit fix' 尝试自动修复"
fi

# 检查过期依赖
echo "检查过期依赖..."
if npm outdated --silent; then
    echo "✅ 依赖版本检查完成"
else
    echo "⚠️ 发现过期依赖，建议更新"
fi

# 5. 代码质量检查
echo ""
echo "🧐 5. 静态代码分析..."

# TypeScript类型检查
echo "TypeScript类型检查..."
if npm run typecheck; then
    echo "✅ 类型检查通过"
else
    echo "❌ 类型检查失败"
    exit 1
fi

# ESLint代码检查
echo "ESLint代码规范检查..."
if npm run lint; then
    echo "✅ 代码规范检查通过"
else
    echo "❌ 代码规范检查失败"
    exit 1
fi

# 6. 安全测试
echo ""
echo "🧪 6. 运行安全测试..."

# 运行所有测试
if npm test; then
    echo "✅ 所有测试通过"
else
    echo "❌ 测试失败"
    exit 1
fi

# 运行性能基准测试
echo "运行性能基准测试..."
if npm run benchmark; then
    echo "✅ 性能基准测试通过"
else
    echo "⚠️ 性能基准测试失败或未配置"
fi

# 7. 构建应用
echo ""
echo "🏗️ 7. 构建应用程序..."

# 设置构建环境变量
export NODE_ENV=production

# 构建渲染进程
echo "构建渲染进程..."
if npm run build:renderer; then
    echo "✅ 渲染进程构建完成"
else
    echo "❌ 渲染进程构建失败"
    exit 1
fi

# 构建主进程
echo "构建主进程..."
if npm run build:main; then
    echo "✅ 主进程构建完成"
else
    echo "❌ 主进程构建失败"
    exit 1
fi

# 8. 生成安装包
echo ""
echo "📦 8. 生成安装包..."

# 检查平台并构建对应的安装包
case "$OSTYPE" in
    darwin*)
        echo "macOS平台构建..."
        if npm run build:mac; then
            echo "✅ macOS安装包构建完成"
        else
            echo "❌ macOS安装包构建失败"
            exit 1
        fi
        ;;
    msys* | cygwin* | win*)
        echo "Windows平台构建..."
        if npm run build:win; then
            echo "✅ Windows安装包构建完成"
        else
            echo "❌ Windows安装包构建失败"
            exit 1
        fi
        ;;
    linux*)
        echo "Linux平台构建..."
        if npm run build:linux; then
            echo "✅ Linux安装包构建完成"
        else
            echo "❌ Linux安装包构建失败"
            exit 1
        fi
        ;;
    *)
        echo "⚠️ 未知平台: $OSTYPE"
        echo "尝试通用构建..."
        if npm run build:all; then
            echo "✅ 通用构建完成"
        else
            echo "❌ 通用构建失败"
            exit 1
        fi
        ;;
esac

# 9. 代码签名 (如果配置了证书)
echo ""
echo "✍️ 9. 代码签名检查..."

# macOS代码签名检查
if [ "$OSTYPE" = "darwin"* ]; then
    if [ -n "$APPLE_ID" ] && [ -n "$APPLE_ID_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
        echo "✅ macOS签名凭据已配置"
        echo "签名将在electron-builder中自动执行"
    else
        echo "⚠️ macOS签名凭据未配置"
        echo "请设置APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID环境变量"
    fi
fi

# Windows代码签名检查
if [ "$OSTYPE" = "msys" ] || [ "$OSTYPE" = "cygwin" ] || [ "$OSTYPE" = "win"* ]; then
    if [ -f "build-resources/certs/windows-cert.p12" ]; then
        echo "✅ Windows签名证书已配置"
    else
        echo "⚠️ Windows签名证书未配置"
        echo "请将证书放置在 build-resources/certs/windows-cert.p12"
    fi
fi

# 10. 构建验证
echo ""
echo "🔍 10. 构建验证..."

# 检查dist目录
if [ -d "dist" ]; then
    echo "✅ dist目录存在"
    echo "构建产物:"
    ls -la dist/
else
    echo "❌ dist目录不存在"
    exit 1
fi

# 检查文件大小 (安装包不应该太大)
echo ""
echo "检查安装包大小..."
for file in dist/*.{dmg,exe,AppImage,deb} 2>/dev/null; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "📦 $file: $size"

        # 警告过大的文件 (>200MB)
        size_mb=$(du -m "$file" | cut -f1)
        if [ "$size_mb" -gt 200 ]; then
            echo "⚠️ 安装包较大 ($size)，请考虑优化"
        fi
    fi
done

# 11. 生成校验和
echo ""
echo "🔐 11. 生成文件校验和..."

if [ -d "dist" ]; then
    cd dist

    # 为所有安装包生成SHA256校验和
    for file in *.{dmg,exe,AppImage,deb} 2>/dev/null; do
        if [ -f "$file" ]; then
            if command -v shasum >/dev/null 2>&1; then
                shasum -a 256 "$file" >> SHA256SUMS.txt
            elif command -v sha256sum >/dev/null 2>&1; then
                sha256sum "$file" >> SHA256SUMS.txt
            fi
        fi
    done

    if [ -f "SHA256SUMS.txt" ]; then
        echo "✅ 校验和文件已生成:"
        cat SHA256SUMS.txt
    fi

    cd ..
fi

# 12. 构建报告
echo ""
echo "📊 12. 构建报告"
echo "=================================="

BUILD_TIME=$(date)
echo "构建时间: $BUILD_TIME"
echo "构建环境: $OSTYPE"
echo "Node.js: $NODE_VERSION"
echo "npm: $NPM_VERSION"

if [ "$CI" = "true" ]; then
    echo "构建类型: CI/CD自动构建"
else
    echo "构建类型: 本地手动构建"
fi

echo ""
echo "✅ 安全构建流程完成!"
echo ""
echo "📦 构建产物位置: dist/"
echo "🔐 校验和文件: dist/SHA256SUMS.txt"
echo ""
echo "后续步骤:"
echo "1. 验证安装包功能"
echo "2. 测试不同平台兼容性"
echo "3. 发布到分发渠道"
echo ""
echo "安全提醒:"
echo "- 请验证代码签名状态"
echo "- 建议在隔离环境中测试安装包"
echo "- 发布前进行最终安全检查"