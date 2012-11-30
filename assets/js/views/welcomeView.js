/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Welcome view.
  
  The first view a user sees when visiting the site.
*/
define([
  // Libs
  'jquery',
  
  // Base views.
  'baseviews/baseView',
  
  // Templates
  'text!templates/welcome.html'
], function ($, BaseView, welcomeTemplate) {
  'use strict';
  
  return BaseView.extend({
    events: {
      
    },
    
    template: _.template(welcomeTemplate),
    
    initialize: function () {
      this.$el.find('.container').html(this.template());
    }
  })
})