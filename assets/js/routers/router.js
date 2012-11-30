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
      'authorize:query': 'authenticateUser',

      // Application routes.
      '': 'welcomePage',
      'inbox': 'inboxPage'
    },
    
    // User authentication URL for the Advice API.
    authUrl: '/api/auth',

    /**
     * Initialize.
     */
    initialize: function () {
      this.user = new UserModel();
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
      
      // console.log('query', query);

      // Post the returned code to the Advice API.
      $.post(this.authUrl, query, _.bind(function (response) {
        if (response.status === 200) {
          this.user.set(response.user);
          this.navigate('inbox', {trigger: true});
        } else {
          console.log('there was an error');
        }
      }, this));

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