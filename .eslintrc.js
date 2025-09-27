module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
  ],
  rules: {
    // React 规则
    'react/react-in-jsx-scope': 'off', // React 17+ 不需要导入React
    'react/prop-types': 'off', // 使用TypeScript时关闭prop-types

    // 通用规则
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off', // TypeScript处理
    'no-undef': 'off', // TypeScript处理
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      // 主进程文件特殊规则
      files: ['src/main/**/*.ts'],
      rules: {
        'no-console': 'off', // 主进程允许console输出
      },
    },
    {
      // 测试文件特殊规则
      files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'build/',
    'dist/',
    'node_modules/',
    'coverage/',
    '*.config.js',
    '.eslintrc.js',
  ],
};