module.exports = {
  testEnvironment: 'node',

  roots: [
    '<rootDir>/tests'
  ],

  testMatch: [
    '**/*.test.js'
  ],

  clearMocks: true,
  restoreMocks: true,

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/legacy/**'
  ],

  coverageDirectory: 'reports/coverage',

  coverageReporters: [
    'text',
    'html',
    'lcov'
  ]
};
