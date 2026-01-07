module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.integration.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@new-building-portal/api-gateway/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 120000, // 120 seconds for integration tests (gateway + listings-service)
};

