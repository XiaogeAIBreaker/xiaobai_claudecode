module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/index.tsx',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/tests/**/*.spec.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.spec.{ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};