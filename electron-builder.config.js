/**
 * Electron Builder 配置
 * 用于跨平台构建 Windows .exe 和 macOS .app
 */

const config = {
  appId: 'com.claude-installer.app',
  productName: 'Claude安装助手',
  copyright: 'Copyright © 2024 Claude Installer Team',

  // 目录配置
  directories: {
    output: 'dist',
    app: 'build',
    buildResources: 'build-resources',
  },

  // 包含的文件
  files: [
    'build/**/*',
    'assets/**/*',
    'config/**/*',
    'node_modules/**/*',
    'package.json',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/*.d.ts',
    '!**/node_modules/.bin',
    '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
    '!.editorconfig',
    '!**/._*',
    '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
    '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
    '!**/{appveyor.yml,.travis.yml,circle.yml}',
    '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}',
  ],

  // 额外资源
  extraResources: [
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*'],
    },
    {
      from: 'config',
      to: 'config',
      filter: ['**/*'],
    },
  ],

  // Windows 配置
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32'],
      },
    ],
    icon: 'assets/icons/app.ico',
    requestedExecutionLevel: 'requireAdministrator',
    artifactName: 'Claude安装助手-${version}-${arch}-Setup.${ext}',
    publisherName: 'Claude Installer Team',
    verifyUpdateCodeSignature: false,
    // Windows代码签名配置
    certificateFile: process.env.WINDOWS_CERT_FILE || 'build-resources/certs/windows-cert.p12',
    certificatePassword: process.env.WINDOWS_CERT_PASSWORD,
    signAndEditExecutable: true,
    signDlls: true,
    rfc3161TimeStampServer: 'http://timestamp.digicert.com',
    timeStampServer: 'http://timestamp.digicert.com',
    extraResources: [
      {
        from: 'build-resources/win',
        to: '.',
        filter: ['**/*'],
      },
    ],
  },

  // NSIS 安装程序配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Claude安装助手',
    installerIcon: 'assets/icons/installer.ico',
    uninstallerIcon: 'assets/icons/uninstaller.ico',
    installerHeaderIcon: 'assets/icons/installer-header.ico',
    installerSidebar: 'assets/images/installer-sidebar.bmp',
    uninstallerSidebar: 'assets/images/uninstaller-sidebar.bmp',
    license: 'LICENSE',
    language: '2052', // 简体中文
    include: 'build-resources/win/installer.nsh',
    script: 'build-resources/win/installer.nsi',
    warningsAsErrors: false,
    unicode: true,
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    menuCategory: '开发工具',
    guid: 'a3c5c1c1-8c9e-4a5b-9c8b-1c2d3e4f5a6b',
  },

  // macOS 配置
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'assets/icons/app.icns',
    category: 'public.app-category.developer-tools',
    artifactName: 'Claude安装助手-${version}-${arch}.${ext}',
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build-resources/mac/entitlements.plist',
    entitlementsInherit: 'build-resources/mac/entitlements.plist',
    extendInfo: {
      LSMinimumSystemVersion: '10.15.0',
      CFBundleLocalizations: ['zh_CN', 'en'],
      NSRequiresAquaSystemAppearance: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
    extraResources: [
      {
        from: 'build-resources/mac',
        to: '.',
        filter: ['**/*'],
      },
    ],
  },

  // DMG 配置
  dmg: {
    title: 'Claude安装助手 ${version}',
    backgroundColor: '#ffffff',
    iconSize: 100,
    iconTextSize: 12,
    window: {
      width: 600,
      height: 400,
    },
    contents: [
      {
        x: 150,
        y: 200,
        type: 'file',
      },
      {
        x: 450,
        y: 200,
        type: 'link',
        path: '/Applications',
      },
    ],
    format: 'ULFO',
    additionalDMGOptions: {
      background: 'assets/images/dmg-background.png',
    },
  },

  // Linux 配置 (可选支持)
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icons/',
    category: 'Development',
    desktop: {
      Name: 'Claude安装助手',
      Comment: '为小白用户设计的Claude Code CLI图形化安装程序',
      Categories: 'Development;',
      StartupWMClass: 'claude-installer',
    },
    artifactName: 'claude-installer-${version}-${arch}.${ext}',
  },

  // 发布配置
  publish: [
    {
      provider: 'github',
      owner: 'claude-installer',
      repo: 'claude-installer',
      releaseType: 'release',
    },
  ],

  // 通用配置
  compression: 'maximum',
  removePackageScripts: true,
  nodeGypRebuild: false,
  npmRebuild: false,

  // 构建前后钩子
  beforeBuild: async (context) => {
    console.log('🏗️  开始构建前准备...');
    // 可以在这里执行构建前的清理、检查等操作
  },

  afterPack: async (context) => {
    console.log('📦 打包完成，正在进行后处理...');
    // 可以在这里执行签名、验证等操作
  },

  afterAllArtifactBuild: async (context) => {
    console.log('✅ 所有构建产物已完成');
    // 可以在这里执行最终的清理、上传等操作
  },
};

module.exports = config;