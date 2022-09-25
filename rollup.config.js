import { terser } from 'rollup-plugin-terser';

const rollupTypescript = require('@rollup/plugin-typescript');

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',
      name: 'Djel',
      exports: 'named',
    },
    {
      file: 'dist/bundle.umd.min.js',
      format: 'umd',
      name: 'Djel',
      plugins: [terser()],
      exports: 'named',
    },
    {
      file: 'dist/bundle.es.js',
      format: 'es',
    },
    {
      file: 'dist/bundle.es.min.js',
      format: 'es',
      plugins: [terser()],
    },
  ],
  plugins: [rollupTypescript({ tsconfig: './tsconfig-rollup.json' })],
};
