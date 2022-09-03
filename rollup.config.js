import { terser } from 'rollup-plugin-terser'

const rollupTypescript = require('@rollup/plugin-typescript')

export default {
  input: 'src/del.ts',
  output: [
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',
      name: 'Del',
    },
    {
      file: 'dist/bundle.umd.min.js',
      format: 'umd',
      name: 'Del',
      plugins: [terser()]
    },
    {
      file: 'dist/bundle.es.js',
      format: 'es',
    },
    {
      file: 'dist/bundle.es.min.js',
      format: 'es',
      plugins: [terser()]
    },
  ],
  plugins: [rollupTypescript({ tsconfig: './tsconfig-rollup.json' })],
}
