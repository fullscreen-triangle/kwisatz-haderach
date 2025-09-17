const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a node context
  mode: 'production',

  entry: './src/extension-minimal.ts', // only compile the minimal extension
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension-minimal.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'nosources-source-map',
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded
  },
  resolve: {
    extensions: ['.ts', '.js']
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
              // Only compile files that are imported
              onlyCompileBundledFiles: true,
              // Skip type checking for faster compilation
              transpileOnly: true
            }
          }
        ]
      }
    ]
  }
};

module.exports = config;
