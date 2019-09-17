const gulp = require('gulp')
const mocha = require('gulp-mocha')

// Load Environment variables required to initialize the bot
require('dotenv').config()

/* gulp.task('test', function () {
  return gulp.src('wdio.conf.js').pipe(webdriver())
}) */

gulp.task('test', function () {
  return gulp.src('test/**/*.js', {read: false})
  // `gulp-mocha` needs filepaths so you can't have any plugins before it
    .pipe(mocha({reporter: 'base'}))
})
