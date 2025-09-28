const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: './src/main/main.ts',
  output: {
    path: path.resolve(__dirname, 'build/main'),
    filename: 'main.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@installer': path.resolve(__dirname, 'src/installer'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@platform': path.resolve(__dirname, 'src/platform'),
      '@config': path.resolve(__dirname, 'config'),
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
    minimize: false, // Electron主进程不压缩，便于调试
  },
};