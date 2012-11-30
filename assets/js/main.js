/*jslint devel: true, browser: true, indent: 2 */
/*global define, require */

(function () {
  'use strict';

  require.config({
    appDir: 'assets/js',
    baseUrl: 'assets/js',
    paths: {
      // Libs
      'jquery': 'libs/jquery',
      'underscore': 'libs/underscore',
      'backbone': 'libs/backbone',
      'modernizr': 'libs/modernizr',
      'text': 'libs/text',

      // Dirs
      'baseviews': 'views/base',
      'routers': 'routers',
      'templates': '../templates'
    },
    shim: {
      'modernizr': {
        exports: 'Modernizr'
      },
      'underscore': {
        exports: '_'
      },
      'backbone': {
        deps: ['jquery', 'underscore'],
        exports: 'Backbone'
      }
    }
  });
}());

define([
  // Libs
  'backbone',
  'modernizr',

  // Router
  'routers/router'
], function (Backbone, Modernizr, Router) {
  'use strict';

  // Start it up.
  var router = new Router();
  Backbone.history.start();
});