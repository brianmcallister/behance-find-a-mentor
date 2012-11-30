/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Matched user model.
*/
define([
  // Libs.
  'backbone'
], function (Backbone) {
  'use strict';
  
  Backbone.Model.extend({
    initialize: function () {
      console.log('init match model');
    }
  });
});