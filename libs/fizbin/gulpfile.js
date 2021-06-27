var gulp = require('gulp');

var sources = ['*.js', 'lib/**/*.js', '!gulpfile.js'];
var testSources = ['test/*.js'];
var allSources = sources.concat(testSources);


gulp.task('test', function () {
  var mocha = require("gulp-mocha");

  gulp.src(testSources)
      .pipe(mocha({ reporter: 'spec', growl: 'true' }));
});


gulp.task('watch', function() {
  gulp.watch(allSources, function() {
    gulp.run('test');
  });
});


gulp.task('default', ['test']);
