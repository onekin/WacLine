import gulp from 'gulp'
import gulpif from 'gulp-if'
import log from 'fancy-log'
import colors from 'ansi-colors'
import named from 'vinyl-named'
import webpack from 'webpack'
import gulpWebpack from 'webpack-stream'
import plumber from 'gulp-plumber'
import livereload from 'gulp-livereload'
import args from './lib/args'
import 'regenerator-runtime/runtime'
import 'core-js/stable'
import ESLintPlugin from 'eslint-webpack-plugin'

const ENV = args.production ? 'production' : 'development'

gulp.task('scripts', () => {
  return gulp.src(['app/scripts/*.js'])
    .pipe(plumber({
      // Webpack will log the errors
      errorHandler () {}
    }))
    .pipe(named())
    .pipe(gulpWebpack({
      devtool: args.sourcemaps ? 'inline-source-map' : false,
      watch: args.watch,
      output: {
        publicPath: ''
      },
      mode: ENV, // TODO Set to ENV. Currently uglify is not encoding contentScript.js in UTF-8
      resolve: {
        fallback: {
          stream: require.resolve('stream-browserify')
        }
      },
      plugins: [
        new ESLintPlugin(),
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
          'window.jQuery': 'jquery',
          process: 'process/browser'
        }),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(ENV),
          'process.env.VENDOR': JSON.stringify(args.vendor)
        })
      ],
      module: {
        rules: [{
          test: /\.js$/,
          exclude: /node_modules/,
          use: [{
            loader: 'babel-loader',
            options: {
              cacheCompression: false
            }
          }]/*,
          query: { compact: false } */
        }]
      },
      optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false
      }
    },
    webpack,
    (err, stats) => {
      if (err) return
      log(`Finished '${colors.cyan('scripts')}'`, stats.toString({
        chunks: false,
        colors: true,
        cached: false,
        children: false
      }))
    }))
    .pipe(gulp.dest(`dist/${args.vendor}/scripts`))
    .pipe(gulpif(args.watch, livereload()))
})
