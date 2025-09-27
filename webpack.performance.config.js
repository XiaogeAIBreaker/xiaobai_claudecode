/**
 * T045: 性能优化的Webpack配置
 * 针对启动时间和包大小的优化配置
 */

const path = require('path');
const webpack = require('webpack');

/**
 * 性能优化配置
 */
const performanceOptimizations = {
  // 代码分割配置
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // 第三方库单独打包
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 20
      },
      // React相关库
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        chunks: 'all',
        priority: 30
      },
      // Material-UI组件
      mui: {
        test: /[\\/]node_modules[\\/]@mui[\\/]/,
        name: 'mui',
        chunks: 'all',
        priority: 25
      },
      // 共享模块
      common: {
        minChunks: 2,
        name: 'common',
        chunks: 'all',
        priority: 10
      }
    }
  },

  // 模块解析优化
  resolve: {
    // 减少解析步骤
    modules: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules')
    ],

    // 优先解析的扩展名
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],

    // 别名配置，减少解析时间
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@main': path.resolve(__dirname, 'src/main')
    },

    // 跳过不必要的解析
    symlinks: false,
    cacheWithContext: false
  },

  // 缓存配置
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    },
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack')
  },

  // 构建优化
  optimization: {
    // 启用Tree Shaking
    usedExports: true,
    sideEffects: false,

    // 模块拼接
    concatenateModules: true,

    // 压缩配置
    minimize: true,
    minimizer: [
      // Terser压缩JS
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            drop_console: true, // 移除console
            drop_debugger: true, // 移除debugger
            pure_funcs: ['console.log'] // 移除特定函数调用
          },
          mangle: {
            safari10: true
          }
        },
        parallel: true,
        extractComments: false
      }),

      // CSS压缩
      new (require('css-minimizer-webpack-plugin'))({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true }
            }
          ]
        }
      })
    ]
  },

  // 性能预算
  performance: {
    maxEntrypointSize: 250000, // 250KB
    maxAssetSize: 250000, // 250KB
    hints: 'warning'
  }
};

/**
 * 渲染器进程优化配置
 */
const rendererOptimizations = {
  ...performanceOptimizations,

  entry: {
    renderer: './src/renderer/index.tsx'
  },

  plugins: [
    // 环境变量
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    }),

    // 预加载关键资源
    new webpack.LoaderOptionsPlugin({
      options: {
        babel: {
          presets: [
            ['@babel/preset-env', {
              modules: false,
              useBuiltIns: 'entry',
              corejs: 3
            }],
            ['@babel/preset-react', {
              runtime: 'automatic'
            }],
            '@babel/preset-typescript'
          ],
          plugins: [
            // 动态导入优化
            '@babel/plugin-syntax-dynamic-import',
            // React优化
            ['babel-plugin-import', {
              libraryName: '@mui/material',
              libraryDirectory: '',
              camel2DashComponentName: false
            }, 'core'],
            ['babel-plugin-import', {
              libraryName: '@mui/icons-material',
              libraryDirectory: '',
              camel2DashComponentName: false
            }, 'icons']
          ]
        }
      }
    })
  ],

  // 模块规则优化
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: false
            }
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: 'tsconfig.json'
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: false
            }
          }
        ]
      }
    ]
  }
};

/**
 * 主进程优化配置
 */
const mainOptimizations = {
  entry: {
    main: './src/main/main.ts'
  },

  target: 'electron-main',

  resolve: performanceOptimizations.resolve,
  cache: performanceOptimizations.cache,

  optimization: {
    minimize: false, // 主进程不需要压缩
    nodeEnv: process.env.NODE_ENV || 'production'
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    })
  ],

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: 'tsconfig.json'
            }
          }
        ]
      }
    ]
  }
};

/**
 * 预加载脚本优化配置
 */
const preloadOptimizations = {
  entry: {
    preload: './src/preload/preload.ts'
  },

  target: 'electron-preload',

  resolve: performanceOptimizations.resolve,
  cache: performanceOptimizations.cache,

  optimization: {
    minimize: true,
    minimizer: [
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            drop_console: true
          }
        }
      })
    ]
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  }
};

/**
 * 性能监控插件
 */
class PerformanceMonitorPlugin {
  apply(compiler) {
    compiler.hooks.beforeRun.tap('PerformanceMonitorPlugin', () => {
      console.log('📊 开始性能优化构建...');
      this.startTime = Date.now();
    });

    compiler.hooks.afterCompile.tap('PerformanceMonitorPlugin', (compilation) => {
      const buildTime = Date.now() - this.startTime;
      const assetSizes = Object.entries(compilation.assets).map(([name, asset]) => ({
        name,
        size: this.formatSize(asset.size())
      }));

      console.log(`\n⚡ 构建完成 (${buildTime}ms)`);
      console.log('\n📦 资源大小:');
      assetSizes.forEach(({ name, size }) => {
        console.log(`  ${name}: ${size}`);
      });

      // 性能警告
      assetSizes.forEach(({ name, size }) => {
        const sizeBytes = parseFloat(size.replace(/[^\d.]/g, '')) * 1024;
        if (sizeBytes > 250000) {
          console.warn(`⚠️  ${name} 超过性能预算 (${size} > 250KB)`);
        }
      });
    });
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = {
  performanceOptimizations,
  rendererOptimizations,
  mainOptimizations,
  preloadOptimizations,
  PerformanceMonitorPlugin
};