// Karma configuration
// Generated on Fri Oct 25 2013 18:35:41 GMT+0100 (BST)

// Port 4444 must be forwarded to Selenium on the virtual machine
var webdriverConfig = {
  url: '127.0.0.1',
  port: 4444
};

var ipAddress = '127.0.0.1';

var os = require('os');
var ifaces = os.networkInterfaces();
for (var dev in ifaces) {
  ifaces[dev].forEach(function(details) {
    if (details.family == 'IPv4' && details.address != '127.0.0.1') {
      ipAddress = details.address;
    }
  });
}

// Create a web server for testing XHR.setRequestHeader (see dialsAjaxSpec.js)
var http = require('http');
http.createServer(function(req, res) {
  var test = req.headers['x-header-test'];
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(test);
}).listen(12345);

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
      'test/testUtil.js',
      'dials.js',
      'test/*Spec.js',
    ],


    preprocessors: {
      '*.js': 'coverage',
      'test/testUtil.js': 'coverage'
    },


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress', 'coverage'],


    proxies: {
      '/header-test': 'http://localhost:12345'
    },


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_DEBUG,


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
        // 'wd_ie7_win',
        // 'sl_ie8_win',
        // 'sl_ie9_win',
        // 'sl_ie10_win'
        // 'sl_ie11_win',
        // 'sl_safari_osx',
    ],

    hostname: ipAddress,

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
      },
      wd_ie7_win: {
        base: 'WebDriver',
        config: webdriverConfig,
        browserName: 'internet explorer',
        version: '7',
        name: 'IE7 WebDriver'
      }
    }
  });
};
