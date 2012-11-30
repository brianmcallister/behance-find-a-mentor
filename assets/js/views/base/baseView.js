/*jslint devel: true, browser: true, indent: 2, nomen: true */
/*global define */

/*
  Base view.
*/
define([
  // Libs.
  'backbone',
  'underscore'
], function (Backbone, _) {
  'use strict';

  return Backbone.View.extend({
    /**
     * View rendering helper.
     * From: http://ianstormtaylor.com/assigning-backbone-subviews-made-even-cleaner/
     *
     * selector - Selector to bind a child view to.
     * view     - An initialized Backbone view to render.
     *
     * Returns this.
     */
    assign: function (selector, view) {
      var selectors;

      if (_.isObject(selector)) {
        selectors = selector;
      } else {
        selectors = {};
        selectors[selector] = view;
      }

      if (!selectors) {
        return;
      }

      _.each(selectors, function (view, selector) {
        view.setElement(this.$(selector)).render();
      }, this);
    }
  });
});