/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Welcome view.

  The first view a user sees when visiting the site.
*/
define([
  // Libs
  'jquery',
  'underscore',

  // Base views.
  'baseviews/baseView',

  // Templates
  'text!templates/welcome.html'
], function ($, _, BaseView, welcomeTemplate) {
  'use strict';

  return BaseView.extend({
    events: {
      'click .sign-in': 'signIn',
      'click .sign-up': 'signUp',
      'click .buttons .button': 'select'
    },

    // View template.
    template: _.template(welcomeTemplate),

    // Behance authorization url.
    authUrl: 'https://www.behance.net/v2/oauth/authenticate',

    // Behance redirect url. This needs to match the redirect URL
    // in the application settings.
    redirectUrl: window.location.href + 'authorize',

    /**
     * Initialize.
     */
    initialize: function () {
      this.$el.find('.container').html(this.template());
    },

    /**
     * Sign a user in with the Behance API.
     *
     * event  - Event from the click.
     *
     * Returns this.
     */
    signIn: function (event) {
      event.preventDefault();
      this.redirect();
      return this;
    },
    
    /**
     * Sign a user up with the Behance API.
     *
     * event  - Event from the click.
     *
     * Returns this.
     */
    signUp: function (event) {
      var type = this.$el.find('.buttons .active').data('type');
      
      event.preventDefault();
      
      if (!type) {
        alert('Please select an account type.');
        return false;
      }
      
      this.redirect({type: type});
    },
    
    /**
     * Redirect the user to authorize.
     */
    redirect: function (query) {
      var queryParams = {
        'client_id': window.app.config.api_key,
        'redirect_uri': this.redirectUrl,
        'scope': 'post_as',
        'state': 'asdfq234'
      };
      
      // Append the account type as a query param.
      if (query) {
        queryParams.redirect_uri = queryParams.redirect_uri + '?' + $.param(query);
      }
      
      console.log('q', queryParams);
      // return false;
      
      // Redirect the user to authenticate.
      window.location.href = this.authUrl + '?' + $.param(queryParams);
    },
    
    /**
     * Select an account type.
     */
    select: function (event) {
      event.preventDefault();
      $(event.target).addClass('active').siblings().removeClass('active');
    }
  });
});