MassAutocomplete
================

Auto Complete for Angularjs applications with a lot to complete

[http://hakib.github.io/MassAutocomplete](http://hakib.github.io/MassAutocomplete)


**Dependencies: **  JQuery, Angular, Angular-Sanitize
**Size: ** 12kb, 5.8kb minified

## Basic Usage 

##### HTML
```html
<html>
  <head>
    <script src="//code.jquery.com/jquery.min.js"></script>
    <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular.js"></script>
    <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular-sanitize.js"></script>

    <script src="massautocomplete.js"></script>
    <!-- Optional -->
    <link href="massautocomplete.theme.css" rel="stylesheet" type="text/css" />
  </head>

  <body ng-app=app>
    <div ng-controller=mainCtrl>
      <div mass-autocomplete>
        <input ng-model='dirty.value'
               mass-autocomplete-item='autocomplete_options' />
        </div>
      </div>
  </body>
</html>
```
##### Javascript 
```javascript
var app = angular.module('app',['MassAutoComplete','ngSanitize']);
app.controller('mainCtrl', function ($scope, $sce, $q) {
  $scope.dirty = {};

  var states = ['Alabama', 'Alaska', 'California' /* ... */ ];

  function suggest_state (term) {
    var q = term.toLowerCase().trim();
    var results = [];

    // Find first 10 states that contain `term`
    for (var i=0; i < states.length && results.length < 10; i++) {
      var state = states[i];
       if (state.toLowerCase().indexOf(q) > -1)
         results.push({
           label : state,
           value : state
         });
    }

    return results;
  }

  $scope.autocomplete_options = {
    suggest : suggest_state
  }
});
```
