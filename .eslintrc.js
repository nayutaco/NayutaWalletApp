module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
  },
  plugins: ['@typescript-eslint', "import"],
  extends: [
    '@react-native-community',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:import/recommended',
    'prettier'
  ],
  rules: {
    'prefer-const': [
      'error',
      {
        destructuring: 'any',
        ignoreReadBeforeAssign: false,
      },
    ],
    'react-native/no-inline-styles': 0,
    'require-await': 0,
    '@typescript-eslint/require-await': 2,
    eqeqeq: 2,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    "import/order": [2, {
      'newlines-between': 'always-and-inside-groups',
      'alphabetize': {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    // We should turn on import/named rule, but it causes "NativeEventEmitter not found in 'react-native'" error even if NativeEventEmitter is callable.
    // At this point, we can't find the way how to solve this problem.
    'import/named': 0,
    'import/no-named-as-default-member': 0, // We could't fined reasonable reason to turn on this rule.
  },
  settings: {
    'import/resolver': {
      typescript: true,
    }
  }
};
