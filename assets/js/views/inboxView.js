/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Inbox view.
  
  Main logged in view for the application.
*/
define([
  // Base views.
  'baseviews/baseView',
  
  // Collections
  'collections/matchesCollection',
  
  // Templates.
  'text!templates/inbox.html',
  'text!templates/matched-user.html'
], function (BaseView, MatchesCollection, inboxTemplate, matchedUserTemplate) {
  'use strict';
  
  return BaseView.extend({
    events: {
      'click .save-user': 'saveUser',
      'click .delete-user': 'deleteUser',
      'click .contact-user': 'contactUser'
    },
    
    template: _.template(inboxTemplate),
    matchTemplate: _.template(matchedUserTemplate), 
    
    // accountType: 'mentor',
    accountType: 'mentee',
    
    initialize: function () {
      console.log('this', this);
      
      // Load from the session.
      if (!this.model.length) {
        this.model.set(window.app.config.user);
      }
      
      // Populate the collection of matches.
      this.collection = new MatchesCollection();
      this.collection.fetch();
      
      this.collection.on('reset', this.renderMatches, this);
    },
    
    /**
     * Render.
     */
    render: function () {
      var $intro;

      // Render the main template.
      this.$el.find('.container').html(this.template(this.model.toJSON()));
      
      $intro = this.$el.find('.account-type-text');
      
      // Get the correct intro text for this account type.
      require(['text!templates/' + this.accountType + '-text.html'], function (response) {
        $intro.html(response);
      });
      
      return this;
    },
    
    renderMatches: function () {
      var $matchList = this.$el.find('.matches-list'),
        markup = '',
        matches = this.collection.models;
      
      if (matches) {
        // Render the matches.
        this.collection.each(function (match) {
          markup += this.matchTemplate(match.toJSON());
        }, this);
      } else {
        markup = 'Sorry, you don\'t have any matches right now.';
      }
      
      $matchList.html(markup);
    },
    
    saveUser: function (event) {
      event.preventDefault();
    },
    
    deleteUser: function (event) {
      var $target = $(event.target),
        $userEntry = $target.closest('.matched-user');
        
      event.preventDefault();
      
      $userEntry.fadeOut(function () {
        $userEntry.remove();
      });
    },
    
    contactUser: function (event) {
      event.preventDefault();
    }
  });
});