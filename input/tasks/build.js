import gulp from 'gulp'
require('./scripts')
require('./manifest')
require('./styles')
require('./pages')
require('./locales')
require('./images')
require('./fonts')
require('./chromereload')
require('./content')
require('./clean')

gulp.task('build', gulp.series('clean', gulp.parallel(
  'manifest',
  'scripts',
  'styles',
  'pages',
  'locales',
  'images',
  'fonts',
  'chromereload',
  'content'
)))
