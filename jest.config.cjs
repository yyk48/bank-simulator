const { createDefaultEsmPreset } = require('ts-jest');

module.exports = {
  ...createDefaultEsmPreset(),
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  testEnvironment: 'node',
  // Source imports use .js for Node ESM; Jest maps them to TypeScript sources.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
};
