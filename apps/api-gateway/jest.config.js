module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  // Include both unit and integration tests in default test run
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        strict: false,
        strictPropertyInitialization: false,
      },
    }],
  },
  moduleNameMapper: {
    '^@new-building-portal/api-gateway/(.*)$': '<rootDir>/src/$1',
    '^@new-building-portal/contracts$': '<rootDir>/../../libs/contracts/src/index.ts',
    '^@new-building-portal/contracts/(.*)$': '<rootDir>/../../libs/contracts/src/$1',
  },
  testTimeout: 120000, // 120 seconds for integration tests (gateway + listings-service)
};

