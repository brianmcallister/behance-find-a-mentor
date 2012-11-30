/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Inbox view.
  
  Main logged in view for the application.
*/
define([
  // Base views.
  'baseviews/baseView',
  
  // Templates.
  'text!templates/inbox.html',
  'text!templates/matched-user.html'
], function (BaseView, inboxTemplate, matchedUserTemplate) {
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
      
      this.renderMatches();
      
      return this;
    },
    
    renderMatches: function () {
      var $matchList = this.$el.find('.matches-list'),
        markup = '',
        test = ['a', 'b', 'c', 'd', 'e'];
      
      // Render the matches.
      _.each(test, function (match) {
        markup += this.matchTemplate({name: match});
      }, this);
      
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