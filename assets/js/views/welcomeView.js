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
      'click .sign-in': 'signIn',
      'click .sign-up': 'signUp'
    },
    
    template: _.template(welcomeTemplate),
    
    authUrl: 'https://www.behance.net/v2/oauth/authenticate',
    redirectUrl: window.location.href + '#auth',
    
    initialize: function () {
      this.$el.find('.container').html(this.template());
    },
    
    signIn: function (event) {
      event.preventDefault();
      
      // Redirect the user to authenticate.
      window.location.href = this.authUrl + '?' + $.param({
        'client_id': window.app.config.api_key,
        'redirect_uri': this.redirectUrl,
        'scope': 'post_as',
        'state': 'asdfq234'
      });
    },
    
    signUp: function (event) {
      event.preventDefault();
      
      console.log('sign up')
    }
  })
})