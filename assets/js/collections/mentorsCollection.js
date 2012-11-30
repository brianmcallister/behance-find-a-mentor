/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Mentors collection.
*/
define([
  // Libs.
  'backbone'
], function (Backbone) {
  'use strict';
  
  Backbone.Collection.extend({
    initialize: function () {
      console.log('init match collection');
    }
  });
});