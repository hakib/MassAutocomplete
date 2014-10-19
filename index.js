"use strict";

$(function () {
  hljs.initHighlightingOnLoad();
});

var app = angular.module('app', ['ngSanitize', 'MassAutoComplete']);

app.controller('mainCtrl', function ($scope, $sce, $q, $timeout) {
  $scope.dirty = {};

  $scope.ac_container_options = {
    debounce_position: 500
  };

  $scope.n_array = function (n) {
    return new Array(n);
  };

  var states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Dakota', 'North Carolina', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
    'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  // Basic
  function suggest_state(term) {
    var q = term.toLowerCase().trim(),
        results = [];

    for (var i = 0; i < states.length && results.length < 10; i++) {
      var state = states[i];
      if (state.toLowerCase().indexOf(q) !== -1)
        results.push({ label: state, value: state });
    }

    return results;
  }

  $scope.callbacks = [];

  $scope.ac_options = {
    suggest: suggest_state,
    on_attach: function () { $scope.callbacks.push('attach'); $scope.$apply(); },
    on_detach: function () { $scope.callbacks.push('detach'); },
    on_select: function (term) { $scope.callbacks.push('select (' + (term ? term.value: term) + ')'); }
  };


  // Highlight
  function highlight(str, term) {
    var highlight_regex = new RegExp('(' + term + ')','gi');
    return str.replace(highlight_regex, '<span class="highlight">$1</span>');
  }

  function suggest_state_with_highlight(term) {
    if (term.length < 2)
      return;

    var suggestions = suggest_state(term);
    suggestions.forEach(function (s) {
      s.label = $sce.trustAsHtml(highlight(s.label, term));
    });

    return suggestions;
  }

  $scope.ac_option_highlight = {
    suggest: suggest_state_with_highlight
  };


  // Delimited
  function suggest_state_delimited(term) {
    var ix = term.lastIndexOf(','),
        lhs = term.substring(0, ix + 1),
        rhs = term.substring(ix + 1),
        suggestions = suggest_state(rhs);

    suggestions.forEach(function (s) {
      s.value = lhs + s.value;
    });

    return suggestions;
  }

  $scope.ac_option_delimited = {
    suggest: suggest_state_delimited
  };


  // Custom Formatting
  function suggest_state_as_tag(term) {
    var suggestions = suggest_state(term);
    suggestions.forEach(function (s) {
      s.label = $sce.trustAsHtml('<span class="badge">' + s.label + '</span>');
    });
    return suggestions;
  }

  $scope.ac_option_tag = {
    suggest: suggest_state_as_tag
  };


  // Using the selected object
  $scope.tags = [];
  function add_tag(selected) {
    $scope.tags.push(selected.value);
    // Clear model
    $scope.dirty.selected_tag = undefined;
  }

  $scope.ac_option_tag_select = {
    suggest: suggest_state_as_tag,
    on_select: add_tag
  };


  // Remote Source
  function suggest_state_remote(term) {
    var deferred = $q.defer();
    // Fake remote source using timeout
    $timeout(function () {
      deferred.resolve(suggest_state(term));
    }, 500);
    return deferred.promise;
  }

  $scope.ac_option_remote = {
    suggest: suggest_state_remote,
    on_error: console.log
  };


  // Passing Objects
  var users = [
    {name: 'Haki', joined: '2 month ago', email: 'Haki@email.com'},
    {name: 'Ran', joined: '1 year ago', email: 'Ran123@ac.org'},
    {name: 'John', joined: 'a week ago', email: 'JJ@gmail.com'},
    {name: 'Marry', joined: '1 month ago', email: 'MarryLove@yahoo.com'},
    {name: 'Charlie', joined: 'Just now', email: 'Charlie1987@msn.com'},
    {name: 'Rebeca', joined: '2 days ago', email: 'Rebeca@mail.com'},
    {name: 'James', joined: '3 month ago', email: '-'}
  ];

  function suggest_users(term) {
    var q = term.toLowerCase().trim(),
        results = [];

    for (var i = 0; i < users.length; i++) {
      var user = users[i];
      if (user.name.toLowerCase().indexOf(q) !== -1 ||
          user.email.toLowerCase().indexOf(q) !== -1)
        results.push({
          value: user.name,
          obj: user,
          label: $sce.trustAsHtml(
            '<div class="row">' +
            '  <div class="col-xs-5"> <i class="fa fa-user"></i>&nbsp;<strong>' + highlight(user.name,term) + '</strong> </div>' +
            '  <div class="col-xs-7 text-right text-muted"><small>' + highlight(user.email,term) + '</small></div>' +
            '  <div class="col-xs-12"> <span class="text-muted">Joined&nbsp;</span>' + user.joined  + '</div>' +
            '</div>'
          )
        });
    }
    return results;
  }

  $scope.ac_options_users = {
    suggest: suggest_users,
    on_select: function (selected) {
      $scope.selected_user = selected.obj;
    }
  };

  // Reusing options
  $scope.dirty.country = [];
});
