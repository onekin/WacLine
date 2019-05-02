const gulp = require('gulp')
const webdriver = require('gulp-webdriver')

// Load Environment variables required to initialize the bot
require('dotenv').config()

gulp.task('test', function () {
  return gulp.src('wdio.conf.js').pipe(webdriver())
})
