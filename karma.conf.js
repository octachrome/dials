// Karma configuration
// Generated on Fri Oct 25 2013 18:35:41 GMT+0100 (BST)

module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',


    // frameworks to use
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      {pattern: 'test-data/*', included: false},
      'lib/*.js',
      '**/*.js'
    ],


    // list of files to exclude
    exclude: [
      'coverage/**'
    ],


    preprocessors: {
      '*.js': 'coverage',
      'test/nearlyEquals.js': 'coverage'
    },


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
        'Chrome',
        // 'Firefox',
        // 'sl_ie7_win',    -- not supported
        // 'sl_ie9_win',
        // 'sl_ie9_win',
        // 'sl_ie10_win'
        // 'sl_ie11_win',
        // 'sl_safari_osx',
    ],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    // global config for SauceLabs
    sauceLabs: {
      username: 'cdbrown',
      accessKey: 'e07338f0-16e9-4131-a4b1-59f5c0b0eb60',
      startConnect: true,
      testName: 'Dials'
    },

    // define SL browsers
    customLaunchers: {
      sl_ie7_win: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows XP',
        version: '7'
      },
      sl_ie8_win: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '8'
      },
      sl_ie9_win: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '9'
      },
      sl_ie10_win: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '10'
      },
      sl_ie11_win: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 8.1',
        version: '11'
      },
      sl_safari_osx: {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.6',
        version: '5'
      }
    }
  });
};
