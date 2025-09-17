const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a node context
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension-minimal.ts', // the entry point of this extension
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension-minimal.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'nosources-source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded
    // Add other externals for AI/ML libraries that are large
    '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node',
    'sqlite3': 'commonjs sqlite3'
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/core': path.resolve(__dirname, 'src/core'),
      '@/models': path.resolve(__dirname, 'src/models'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/ui': path.resolve(__dirname, 'src/ui'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/storage': path.resolve(__dirname, 'src/storage')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                "module": "es6" // override `tsconfig.json` so that TypeScript emits native JavaScript modules
              }
            }
          }
        ]
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      },
      {
        test: /\.json$/,
        type: 'json'
      }
    ]
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        huggingface: {
          test: /[\\/]node_modules[\\/](@huggingface|@xenova)[\\/]/,
          name: 'huggingface',
          chunks: 'all',
        },
        tensorflow: {
          test: /[\\/]node_modules[\\/]@tensorflow[\\/]/,
          name: 'tensorflow',
          chunks: 'all',
        },
        ai_vendors: {
          test: /[\\/]node_modules[\\/](openai|@anthropic-ai)[\\/]/,
          name: 'ai-vendors',
          chunks: 'all',
        }
      }
    },
    minimize: false // We'll enable this for production builds
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 2500000, // 2.5MB - VSCode extensions can be larger due to AI models
    maxAssetSize: 2500000
  },
  node: {
    __dirname: false,
    __filename: false
  },
  plugins: [],
  stats: {
    warnings: false,
    errors: true,
    errorDetails: true
  }
};

// Production configuration
if (process.env.NODE_ENV === 'production') {
  config.mode = 'production';
  config.optimization.minimize = true;
  config.devtool = 'source-map';
  config.performance.hints = 'error';
}

module.exports = config;
