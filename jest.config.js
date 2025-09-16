module.exports = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directories
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // File patterns to match
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Module name mapping (aliases)
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/storage/(.*)$': '<rootDir>/src/storage/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/extension.ts', // Skip main extension file for now
    '!**/*.interface.ts',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout
  testTimeout: 30000, // 30 seconds for AI model operations

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',

  // Mock configuration
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Module resolution
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/models/',
    '/data/',
    '/coverage/'
  ],

  // Transform ignore patterns (for ES modules)
  transformIgnorePatterns: [
    'node_modules/(?!(@huggingface|@xenova|node-fetch)/)'
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }
  },

  // Test reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        suiteName: 'Kwisatz-Haderach Citation Intelligence Tests'
      }
    ]
  ],

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/models/',
    '/coverage/'
  ],

  // Snapshot configuration
  snapshotSerializers: [
    '<rootDir>/tests/serializers/citation-serializer.ts'
  ],

  // Test categories
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
      testTimeout: 60000 // Longer timeout for integration tests
    }
  ]
};
