module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'js', 'tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': '<rootDir>/node_modules/babel-jest',
  },
  testMatch: ['<rootDir>/**/*.test.(js|jsx|ts|tsx)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
