module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-duplicate-enum-values': 'error',
    '@typescript-eslint/prefer-enum-initializers': 'error',
    '@typescript-eslint/prefer-literal-enum-member': 'error',
  },
};
