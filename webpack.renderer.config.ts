import path from 'node:path';

import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';

export const rendererConfig: Configuration = {
  devtool: 'source-map',
  module: {
    rules: [
      ...rules,
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      // The few pictures of the window are small and go inside the bundle as `data:` addresses, which
      // the page's content security policy already allows (`img-src 'self' data:`): no file to serve
      // and no other address for the page to be allowed to read.
      {
        test: /\.webp$/,
        type: 'asset/inline',
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    extensions: ['.js', '.ts', '.tsx'],
  },
};
