import fastGlob from 'fast-glob';
import wrapAnsi from 'wrap-ansi';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import FixStyleOnlyEntriesPlugin from 'webpack-fix-style-only-entries';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import PostCSSPresetEnv from 'postcss-preset-env';
import TerserPlugin from 'terser-webpack-plugin';
import VueLoaderPlugin from 'vue-loader/lib/plugin';
import {resolve, parse} from 'path';
import {LicenseWebpackPlugin} from 'license-webpack-plugin';
import {SourceMapDevToolPlugin} from 'webpack';

const glob = (pattern) => fastGlob.sync(pattern, {cwd: __dirname, absolute: true});

const themes = {};
for (const path of glob('web_src/less/themes/*.less')) {
  themes[parse(path).name] = [path];
}

const isProduction = process.env.NODE_ENV !== 'development';

const filterCssImport = (url, ...args) => {
  const cssFile = args[1] || args[0]; // resourcePath is 2nd argument for url and 3rd for import
  const importedFile = url.replace(/[?#].+/, '').toLowerCase();

  if (cssFile.includes('fomantic')) {
    if (/brand-icons/.test(importedFile)) return false;
    if (/(eot|ttf|otf|woff|svg)$/.test(importedFile)) return false;
  }

  if (cssFile.includes('font-awesome')) {
    if (/(eot|ttf|otf|woff|svg)$/.test(importedFile)) return false;
  }

  return true;
};

const postCSSPlugins = () => [
  PostCSSPresetEnv({
    features: {
      'system-ui-font-family': false,
    },
  }),
];

export default {
  mode: isProduction ? 'production' : 'development',
  entry: {
    index: [
      resolve(__dirname, 'web_src/js/jquery.js'),
      resolve(__dirname, 'web_src/fomantic/build/semantic.js'),
      resolve(__dirname, 'web_src/js/index.js'),
      resolve(__dirname, 'web_src/fomantic/build/semantic.css'),
      resolve(__dirname, 'web_src/less/index.less'),
    ],
    swagger: [
      resolve(__dirname, 'web_src/js/standalone/swagger.js'),
    ],
    serviceworker: [
      resolve(__dirname, 'web_src/js/serviceworker.js'),
    ],
    'eventsource.sharedworker': [
      resolve(__dirname, 'web_src/js/features/eventsource.sharedworker.js'),
    ],
    ...themes,
  },
  devtool: false,
  output: {
    path: resolve(__dirname, 'public'),
    filename: ({chunk}) => {
      // serviceworker can only manage assets below it's script's directory so
      // we have to put it in / instead of /js/
      return chunk.name === 'serviceworker' ? '[name].js' : 'js/[name].js';
    },
    chunkFilename: 'js/[name].js',
  },
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        sourceMap: true,
        extractComments: false,
        terserOptions: {
          output: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin({
        sourceMap: true,
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: {
                removeAll: true,
              },
            },
          ],
        },
      }),
    ],
    splitChunks: {
      chunks: 'async',
      name: (_, chunks) => chunks.map((item) => item.name).join('-'),
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        exclude: /node_modules/,
        loader: 'vue-loader',
      },
      {
        test: /\.worker\.js$/,
        exclude: /monaco/,
        use: [
          {
            loader: 'worker-loader',
            options: {
              inline: 'no-fallback',
            },
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'swc-loader',
            options: {
              sourceMap: true,
              env: {
                mode: 'usage',
                coreJs: 3,
              },
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                  dynamicImport: true,
                }
              }
            },
          },
        ],
      },
      {
        test: /.css$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              url: filterCssImport,
              import: filterCssImport,
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: postCSSPlugins,
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /.less$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              url: filterCssImport,
              import: filterCssImport,
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: postCSSPlugins,
              sourceMap: true,
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        include: resolve(__dirname, 'public/img/svg'),
        use: [
          {
            loader: 'raw-loader',
          },
        ],
      },
      {
        test: /\.(ttf|woff2?)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
              publicPath: (url) => `../fonts/${url}`, // required to remove css/ path segment
            },
          },
        ],
      },
      {
        test: /\.png$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'img/webpack/',
              publicPath: (url) => `../img/webpack/${url}`, // required to remove css/ path segment
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    // avoid generating useless js output files for css--only chunks
    new FixStyleOnlyEntriesPlugin({
      extensions: ['less', 'scss', 'css'],
      silent: true,
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      chunkFilename: 'css/[name].css',
    }),
    new SourceMapDevToolPlugin({
      filename: '[file].map',
      include: [
        'js/index.js',
        'css/index.css',
      ],
    }),
    new MonacoWebpackPlugin({
      filename: 'js/monaco-[name].worker.js',
    }),
    new LicenseWebpackPlugin({
      outputFilename: 'js/licenses.txt',
      perChunkOutput: false,
      addBanner: false,
      skipChildCompilers: true,
      modulesDirectories: [
        resolve(__dirname, 'node_modules'),
      ],
      renderLicenses: (modules) => {
        const line = '-'.repeat(80);
        return modules.map((module) => {
          const {name, version} = module.packageJson;
          const {licenseId, licenseText} = module;
          const body = wrapAnsi(licenseText || '', 80);
          return `${line}\n${name}@${version} - ${licenseId}\n${line}\n${body}`;
        }).join('\n');
      },
      stats: {
        warnings: false,
        errors: true,
      },
    }),
  ],
  performance: {
    hints: false,
    maxEntrypointSize: Infinity,
    maxAssetSize: Infinity,
  },
  resolve: {
    symlinks: false,
    alias: {
      vue$: 'vue/dist/vue.esm.js', // needed because vue's default export is the runtime only
    },
  },
  watchOptions: {
    ignored: [
      'node_modules/**',
    ],
  },
  stats: {
    children: false,
    excludeAssets: [
      // exclude monaco's language chunks in stats output for brevity
      // https://github.com/microsoft/monaco-editor-webpack-plugin/issues/113
      /^js\/[0-9]+\.js$/,
    ],
  },
};
