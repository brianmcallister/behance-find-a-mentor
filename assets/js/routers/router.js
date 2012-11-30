/*jslint devel: true, browser: true, indent: 2 */
/*global define */

/*
  Main site router.
*/
define([
  // Libs
  'jquery',
  'backbone',
  
  // Models
  'models/userModel',

  // Views
  'views/welcomeView',
  'views/inboxView',
], function ($, Backbone, UserModel, WelcomeView, InboxView) {
  'use strict';

  return Backbone.Router.extend({
    routes: {
      // Authenticatd route.
      'auth:query': 'authenticateUser',

      // Application routes.
      '': 'welcomePage',
      'inbox': 'inboxPage'
    },
    
    // User authentication URL for the Advice API.
    authUrl: '/api/authorize',

    /**
     * Initialize.
     */
    initialize: function () {
      this.user = new UserModel({
        username: 'Your Name'
      });
    },

    /**
     * All test route.
     */
    all: function (route) {
      console.log('route', route);
    },
    
    /**
     * Authenticate a user by posting the auth code to the
     * Advice API.
     *
     * Returns this.
     */
    authenticateUser: function (route) {
      var query = this.parseQueryString(route);

      // Post the returned code to the Advice API.
      $.post(this.authUrl, function (response) {
        console.log('response', response);
      });

      console.log('query', query);
      return this;
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
     * Inbox page. Main logged in view.
     *
     * Returns this.
     */
    inboxPage: function () {
      console.log('inbox');
      
      if (!this.inboxView) {
        this.inboxView = new InboxView({el: 'body', model: this.user});
      }
      
      this.inboxView.render();
      
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