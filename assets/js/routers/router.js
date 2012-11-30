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
      // Authenticatd route.
      'auth:query': 'authenticateUser',
      
      // Application routes.
      '': 'welcomePage'
    },
    
    tokenUrl: 'https://www.behance.net/v2/oauth/token',
    
    /**
     * Initialize.
     */
    initialize: function () {
    },
    
    /**
     * All test route.
     */
    all: function (route) {
      console.log('route', route);
    },
    
    /**
     * Home page route.
     *
     * Returns this.
     */
    welcomePage: function () {
      if (!this.welcomeView) {
        this.welcomeView = new WelcomeView({el: 'body'});
      }
      
      this.welcomeView.render();
      
      return this;
    },
    
    /**
     * Authenticate a user by posting the auth code to the
     * Advice API.
     *
     * Returns this.
     */
    authenticateUser: function (route) {
      var query = this.parseQueryString(route);
      
      console.log('query', query);
      return this;
    },
    
    /**
     * Parse a query string.
     *
     * string - Query string to parse.
     *
     * Returns an object with the parsed query string in key => value format.
     */
    parseQueryString: function (string) {
      var query = {};
      
      // Remove the '?'
      if (string.charAt(0) === '?') {
        string = string.slice(1);
      }

      _.each(string.split('&'), function (part) {
        var keyValue = part.split('=');
        query[keyValue[0]] = keyValue[1];
      }, this);

      return query;
    }
  });
});