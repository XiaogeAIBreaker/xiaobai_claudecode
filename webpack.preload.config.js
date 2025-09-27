const path = require('path');

module.exports = {
  target: 'electron-preload',
  entry: './src/preload/preload.ts',
  output: {
    path: path.resolve(__dirname, 'build/preload'),
    filename: 'preload.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    electron: 'commonjs electron',
  },
  optimization: {
    minimize: false, // 预加载脚本不压缩，便于调试
  },
};