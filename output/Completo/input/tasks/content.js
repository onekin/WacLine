import gulp from 'gulp'
import gulpif from 'gulp-if'
import livereload from 'gulp-livereload'
import args from './lib/args'

gulp.task('content', () => {
  return gulp.src('app/content/**/*.*')
    .pipe(gulp.dest(`dist/${args.vendor}/content`))
    .pipe(gulpif(args.watch, livereload()))
})
