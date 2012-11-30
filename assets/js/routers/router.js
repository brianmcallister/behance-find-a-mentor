/*jslint devel: true, browser: true, indent: 2 */
/*global define */

/*
  Main site router.
*/
define([
  // Libs
  'backbone',
  
  // Views
  'views/welcomeView'
], function (Backbone, WelcomeView) {
  'use strict';
  
  return Backbone.Router.extend({
    routes: {
      '': 'welcomePage'
    },
    
    /**
     * Initialize.
     */
    initialize: function () {
    },
    
    /**
     * Home page route.
     */
    welcomePage: function () {
      if (!this.welcomeView) {
        this.welcomeView = new WelcomeView({el: 'body'});
      }
      
      this.welcomeView.render();
    }
  });
});