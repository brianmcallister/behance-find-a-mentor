/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Mentors collection.
*/
define([
  // Libs.
  'backbone',
  
  // Models
  'models/matchModel'
], function (Backbone, MatchModel) {
  'use strict';
  
  return Backbone.Collection.extend({
    url: '/api/users',
    
    model: MatchModel,
    
    parse: function (response) {
      return response.users;
    },
    
    initialize: function () {
    }
  });
});