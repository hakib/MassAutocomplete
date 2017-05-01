/* global angular */
(function() {
'use strict';

angular.module('MassAutoComplete', [])

.provider('massAutocompleteConfig', function() {
  var config = this;

  config.KEYS = {
    TAB: 9,
    ESC: 27,
    ENTER: 13,
    UP: 38,
    DOWN: 40
  };

  config.EVENTS = {
    KEYDOWN: 'keydown',
    RESIZE: 'resize',
    BLUR: 'blur'
  };

  config.DEBOUNCE = {
    position: 150,
    attach: 300,
    suggest: 200,
    blur: 150
  };

  config.generate_random_id = function(prefix) {
    return prefix + '_' + Math.random().toString().substring(2);
  };

  // Position ac container given a target element
  config.position_autocomplete = function(container, target) {
    var rect = target[0].getBoundingClientRect(),
        scrollTop = document.body.scrollTop || document.documentElement.scrollTop || window.pageYOffset,
        scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft || window.pageXOffset;

    container[0].style.top = rect.top + rect.height + scrollTop + 'px';
    container[0].style.left = rect.left + scrollLeft + 'px';
    container[0].style.width = rect.width + 'px';
  };

  this.$get = function() {
    return config;
  };
})

.directive('massAutocomplete', ['massAutocompleteConfig', '$timeout', '$window', '$document', '$q', function(config, $timeout, $window, $document, $q) {
  return {
    restrict: 'A',
    scope: {
      options: '&massAutocomplete'
    },
    transclude: true,
    template:
      '<span ng-transclude></span>' +

      '<div class="ac-container" ' +
           'aria-autocomplete="list" ' +
           'role="listbox" ' +
           'ng-show="show_autocomplete">' +

        '<ul class="ac-menu"> ' +
          '<li ng-repeat="result in results" ng-if="$index > 0" ' +
            'class="ac-menu-item" ' +
            'role="option" ' +
            'id="{{result.id}}" ' +
            'ng-class="$index == selected_index ? \'ac-state-focus\': \'\'">' +
            '<a href ng-click="apply_selection($index)" ng-bind-html="result.label"></a>' +
          '</li>' +
        '</ul>' +

      '</div>',

    link: function(scope, element) {
      scope.container = angular.element(element[0].getElementsByClassName('ac-container')[0]);
      scope.container[0].style.position = 'absolute';
    },

    controller: ['$scope', function($scope) {
      var that = this;

      var bound_events = {};
      bound_events[config.EVENTS.BLUR] = null;
      bound_events[config.EVENTS.KEYDOWN] = null;
      bound_events[config.EVENTS.RESIZE] = null;

      var _user_options = $scope.options() || {};
      var user_options = {
        debounce_position: _user_options.debounce_position || config.DEBOUNCE.position,
        debounce_attach: _user_options.debounce_attach || config.DEBOUNCE.attach,
        debounce_suggest: _user_options.debounce_suggest || config.DEBOUNCE.suggest,
        debounce_blur: _user_options.debounce_blur || config.DEBOUNCE.blur
      };

      var current_element,
          current_model,
          current_options,
          previous_value,
          value_watch,
          last_selected_value,
          current_element_random_id_set;

      $scope.show_autocomplete = false;

      function show_autocomplete() {
        $scope.show_autocomplete = true;
      }

      function hide_autocomplete() {
        $scope.show_autocomplete = false;
        clear_selection();
      }

      // Debounce - taken from underscore.
      function debounce(func, wait, immediate) {
        var timeoutPromise;
        return function() {
          var context = this, args = arguments;
          var later = function() {
            timeoutPromise = null;
            if (!immediate) {
              func.apply(context, args);
            }
          };
          var callNow = immediate && !timeoutPromise;
          $timeout.cancel(timeoutPromise);
          timeoutPromise = $timeout(later, wait);
          if (callNow) {
            func.apply(context, args);
          }
        };
      }

      // Make sure an element has id.
      // Return true if id was generated.
      function ensure_element_id(element) {
        if (!element.id || element.id === '') {
          element.id = config.generate_random_id('ac_element');
          return true;
        }
        return false;
      }

      function _position_autocomplete() {
        config.position_autocomplete($scope.container, current_element);
      }
      var position_autocomplete = debounce(_position_autocomplete, user_options.debounce_position);

      function _suggest(term, target_element) {
        $scope.selected_index = 0;
        $scope.waiting_for_suggestion = true;

        if (typeof(term) === 'string' && term.length > 0) {
          $q.when(current_options.suggest(term),
            function suggest_succeeded(suggestions) {
              // Make sure the suggestion we are processing is of the current element.
              // When using remote sources for example, a suggestion cycle might be
              // triggered at a later time (When a different field is in focus).
              if (!current_element || current_element !== target_element) {
                return;
              }

              if (suggestions && suggestions.length > 0) {
                // Set unique id to each suggestion so we can
                // reference them (aria)
                suggestions.forEach(function(s) {
                  if (!s.id) {
                    s.id = config.generate_random_id('ac_item');
                  }
                });
                // Add the original term as the first value to enable the user
                // to return to his original expression after suggestions were made.
                $scope.results = [{ value: term, label: '', id: ''}].concat(suggestions);
                show_autocomplete();
                if (current_options.auto_select_first) {
                  set_selection(1);
                }
              } else {
                $scope.results = [];
                hide_autocomplete();
              }
            },
            function suggest_failed(error) {
              hide_autocomplete();
              if (current_options.on_error) {
                current_options.on_error(error);
              }
            }
          ).finally(function suggest_finally() {
            $scope.waiting_for_suggestion = false;
          });
        } else {
          $scope.waiting_for_suggestion = false;
          hide_autocomplete();
          $scope.$apply();
        }
      }
      var suggest = debounce(_suggest, user_options.debounce_suggest);

      // Attach autocomplete behavior to an input element.
      function _attach(ngmodel, target_element, options) {
        // Element is already attached.
        if (current_element === target_element) {
          return;
        }

        // Safe: clear previously attached elements.
        if (current_element) {
          that.detach();
        }

        // The element is still the active element.
        if (target_element[0] !== $document[0].activeElement) {
          return;
        }

        if (options.on_attach) {
          options.on_attach();
        }

        current_element = target_element;
        current_model = ngmodel;
        current_options = options;
        previous_value = ngmodel.$viewValue;
        current_element_random_id_set = ensure_element_id(target_element);
        $scope.container[0].setAttribute('aria-labelledby', current_element.id);

        $scope.results = [];
        $scope.selected_index = -1;
        bind_element();

        value_watch = $scope.$watch(
          function() {
            return ngmodel.$modelValue;
          },
          function(nv) {
            // Prevent suggestion cycle when the value is the last value selected.
            // When selecting from the menu the ng-model is updated and this watch
            // is triggered. This causes another suggestion cycle that will provide as
            // suggestion the value that is currently selected - this is unnecessary.
            if (nv === last_selected_value) {
              return;
            }

            _position_autocomplete();
            suggest(nv, current_element);
          }
        );
      }
      that.attach = debounce(_attach, user_options.debounce_attach);

      // Trigger end of editing and remove all attachments made by
      // this directive to the input element.
      that.detach = function() {
        if (current_element) {
          var value = current_element.val();
          update_model_value(value);
          if (current_options.on_detach) {
            current_options.on_detach(value);
          }
          current_element.unbind(config.EVENTS.KEYDOWN, bound_events[config.EVENTS.KEYDOWN]);
          current_element.unbind(config.EVENTS.BLUR, bound_events[config.EVENTS.BLUR]);
          if (current_element_random_id_set) {
            current_element[0].removeAttribute('id');
          }
        }
        hide_autocomplete();
        $scope.container[0].removeAttribute('aria-labelledby');
        // Clear references and config.events.
        angular.element($window).unbind(config.EVENTS.RESIZE, bound_events[config.EVENTS.RESIZE]);
        if (value_watch) {
          value_watch();
        }
        $scope.selected_index = $scope.results = undefined;
        current_model = current_element = previous_value = undefined;
      };

      // Update angular's model view value.
      // It is important that before triggering hooks the model's view
      // value will be synced with the visible value to the user. This will
      // allow the consumer controller to rely on its local ng-model.
      function update_model_value(value) {
        if (current_model.$modelValue !== value) {
          current_model.$setViewValue(value);
          current_model.$render();
        }
      }

      function clear_selection() {
        $scope.selected_index = -1;
        $scope.container[0].removeAttribute('aria-activedescendant');
      }

      // Set the current selection while navigating through the menu.
      function set_selection(i) {
        // We use value instead of setting the model's view value
        // because we watch the model value and setting it will trigger
        // a new suggestion cycle.
        var selected = $scope.results[i];
        current_element.val(selected.value);
        $scope.selected_index = i;
        $scope.container[0].setAttribute('aria-activedescendant', selected.id);
        return selected;
      }

      // Apply and accept the current selection made from the menu.
      // When selecting from the menu directly (using click or touch) the
      // selection is directly applied.
      $scope.apply_selection = function(i) {
        current_element[0].focus();
        if (!$scope.show_autocomplete || i > $scope.results.length || i < 0) {
          return;
        }

        var selected = set_selection(i);
        last_selected_value = selected.value;
        update_model_value(selected.value);
        hide_autocomplete();

        if (current_options.on_select) {
          current_options.on_select(selected);
        }
      };

      function bind_element() {
        angular.element($window).bind(config.EVENTS.RESIZE, position_autocomplete);

        bound_events[config.EVENTS.BLUR] = function() {
          // Detach the element from the auto complete when input loses focus.
          // Focus is lost when a selection is made from the auto complete menu
          // using the mouse (or touch). In that case we don't want to detach so
          // we wait several ms for the input to regain focus.
          $timeout(function() {
            if (!current_element || current_element[0] !== $document[0].activeElement) {
              that.detach();
            }
          }, user_options.debounce_blur);
        };
        current_element.bind(config.EVENTS.BLUR, bound_events[config.EVENTS.BLUR]);

        bound_events[config.EVENTS.KEYDOWN] = function(e) {
          // Reserve key combinations with shift for different purposes.
          if (e.shiftKey) {
            return;
          }

          switch (e.keyCode) {
            // Close the menu if it's open. Or, undo changes made to the value
            // if the menu is closed.
            case config.KEYS.ESC:
              if ($scope.show_autocomplete) {
                hide_autocomplete();
                $scope.$apply();
              } else {
                current_element.val(previous_value);
              }
              break;

            // Select an element and close the menu. Or, if a selection is
            // unavailable let the event propagate.
            case config.KEYS.ENTER:
              // Accept a selection only if results exist, the menu is
              // displayed and the results are valid (no current request
              // for new suggestions is active).
              if ($scope.show_autocomplete &&
                  $scope.selected_index > 0 &&
                  !$scope.waiting_for_suggestion) {
                $scope.apply_selection($scope.selected_index);
                // When selecting an item from the AC list the focus is set on
                // the input element. So the enter will cause a keypress event
                // on the input itself. Since this enter is not intended for the
                // input but for the AC result we prevent propagation to parent
                // elements because this event is not of their concern. We cannot
                // prevent events from firing when the event was registered on
                // the input itself.
                e.stopPropagation();
                e.preventDefault();
              }

              hide_autocomplete();
              $scope.$apply();
              break;

            // Navigate the menu when it's open. When it's not open fall back
            // to default behavior.
            case config.KEYS.TAB:
              if (!$scope.show_autocomplete) {
                break;
              }

              e.preventDefault();

            // Open the menu when results exists but are not displayed. Or,
            // select the next element when the menu is open. When reaching
            // bottom wrap to top.
            /* falls through */
            case config.KEYS.DOWN:
              if ($scope.results.length > 0) {
                if ($scope.show_autocomplete) {
                  set_selection($scope.selected_index + 1 > $scope.results.length - 1 ? 0 : $scope.selected_index + 1);
                } else {
                  show_autocomplete();
                  set_selection(0);
                }
                $scope.$apply();
              }
              break;

            // Navigate up in the menu. When reaching the top wrap to bottom.
            case config.KEYS.UP:
              if ($scope.show_autocomplete) {
                e.preventDefault();
                set_selection($scope.selected_index - 1 >= 0 ? $scope.selected_index - 1 : $scope.results.length - 1);
                $scope.$apply();
              }
              break;
          }
        };
        current_element.bind(config.EVENTS.KEYDOWN, bound_events[config.EVENTS.KEYDOWN]);
      }

      $scope.$on('$destroy', function() {
        that.detach();
        $scope.container.remove();
      });
    }]
  };
}])

.directive('massAutocompleteItem', function() {
  return {
    restrict: 'A',
    require: [
      '^massAutocomplete',
      'ngModel'
    ],
    scope: {
      'massAutocompleteItem' : '&'
    },
    link: function(scope, element, attrs, required) {
      // Prevent html5/browser auto completion.
      attrs.$set('autocomplete', 'off');

      var acContainer = required[0];
      var ngModel = required[1];

      element.bind('focus', function() {
        var options = scope.massAutocompleteItem();
        if (!options) {
          throw new Error('Invalid options');
        }
        acContainer.attach(ngModel, element, options);
      });
    }
  };
});
})();
