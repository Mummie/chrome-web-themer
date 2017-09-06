module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['sinon-chrome', 'mocha', 'chai', 'browserify'],
    browserify: {
      debug: true,
      transform: [
        ['babelify', { plugins: ['babel-plugin-espower'] }]
      ]
    },
    files: [
      { pattern: 'app/bower_components/angular/*.js', included: false },
      { pattern: 'test/data/*.json', included: false },
      { pattern: 'test/*.js', included: true },
      { pattern: 'app/scripts/*.js', included: false }
    ],
    preprocessors: {
      'test/*.js': 'browserify'
    },
    plugins: ['karma-sinon-chrome', 'karma-mocha', 'karma-chai', 'karma-babel-preprocessor', 'karma-browserify', 'karma-chrome-launcher'],
    reporters: ['progress'],
    port: 9876,  // karma web server port
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['Chrome', 'ChromeHeadless'],
    autoWatch: false,
    // singleRun: false, // Karma captures browsers, runs the tests and exits
    concurrency: Infinity
  });
}
