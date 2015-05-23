'use strict';

beforeEach(function(){
  jasmine.addMatchers({

    toHaveClass: function() {
      return {
        compare: function(elm, classname) {
          return {pass : angular.element(elm).hasClass(classname)}
        }
      }
    },

    toHaveNChildren: function() {
      return {
        compare: function (ac_element, n) {
          var children = angular.element(ac_element)[0].querySelectorAll('.ac-menu-item');
          return { pass: children.length == n};
        }
      }
    },

    toBeVisible: function() {
      return {
        compare: function (ac_element) {
          return { pass: angular.element(ac_element).hasClass('ng-show') };
        }
      }
    },

    toHaveFocus: function() {
      return {
        compare: function(actual) {
          return {
            pass: document.activeElement === actual[0]
          };
        }
      }
    }

  });
});

describe('MassAutoComplete', function() {
  var rootScope, compile, timeout, document_, window_;

  beforeEach(module('MassAutoComplete'));

  beforeEach(inject(function($rootScope, $compile, $timeout, $document, $window) {
    rootScope = $rootScope;
    compile = $compile;
    timeout = $timeout;
    document_ = $document;
    window_ = $window;
  }));

  // Helper Functions

  function getMassCompiledElement(template, scope_data) {
    var scope = rootScope.$new();
    angular.extend(scope, scope_data)
    var compiledDirective = compile(angular.element(template))(scope);
    document_.find('body').append(compiledDirective); // Must render element to test focus
    scope.$digest();
    return compiledDirective;
  }

  function getMassItem(element, i) {
    return angular.element(element[0].querySelectorAll('[mass-autocomplete-item]')[i])
  }

  function getMassScope(element) {
    return angular.element(element[0].querySelectorAll('[ng-transclude]')).scope();
  }

  function focusElement(element) {
    element[0].focus();
    element.triggerHandler('focus');
  }

  // AC Options

  var SIMPLE_TEMPLATE = "<div mass-autocomplete=ac_options><input ng-model='dirty.value' mass-autocomplete-item=item_options></div>";

  var data = ['A','B','C','D','A1','A2'];

  function simpleSuggest(term) {
    console.log('suyggestin for ', term);
    var results = [];
    data.forEach(function(v) {
      if (v.indexOf(term) > -1) {
        results.push({
          value: v,
          label: v
        })
      }
    });
    return results;
  }

  var simple_ac_options = {
    debounce_attach: 1,
    debounce_suggest: 1,
    debounce_position: 1,
  };

  var simple_item_options = {
    suggest: simpleSuggest,
    on_attach: function () {},
    on_detach: function () {},
  };

  // Fun begins here

  it("should create a suggestion box with no items", inject(function() {
    var element = getMassCompiledElement(SIMPLE_TEMPLATE);
    var scope = getMassScope(element);
    expect(scope.container).toBeDefined();
    expect(scope.container).toHaveClass('ac-container');
    var ac_menu = scope.container[0].querySelectorAll('.ac-menu');
    expect(ac_menu).toBeDefined();
    expect(element).toHaveNChildren(0);
    expect(element).not.toBeVisible();
  }));

  it("should set autocomplete attribute to off on mass-autocomplete-item", inject(function() {
    var element = getMassCompiledElement(SIMPLE_TEMPLATE);
    expect(getMassItem(element,0).attr('autocomplete')).toEqual('off');
  }));

  it("should set autocomplete attribute to off on mass-autocomplete-item even if explicity set to on", inject(function() {
    var element = getMassCompiledElement(
      "<div mass-autocomplete><input ng-model='dirty.value' mass-autocomplete-item autocomplete=\"on\"></div>"
    );
    expect(getMassItem(element,0).attr('autocomplete')).toEqual('off');
  }));

  it("should fail when there is no ng-model on the MassAutocompleteItem", inject(function() {
    expect(function() {
        getMassCompiledElement(
          "<div mass-autocomplete><input mass-autocomplete-item></div>"
        );
      }
    ).toThrow();
  }));

  it("should fail when options are not provided to MassAutocompleteItem", inject(function() {
    var ac = getMassCompiledElement(SIMPLE_TEMPLATE, undefined);
    var item = getMassItem(ac,0);
    expect(function () { focusElement(item); }).toThrow();
  }));


  describe("MassAutoComplete - Attach", function () {
    var element, item;

    beforeEach(function(done) {
      element = getMassCompiledElement(SIMPLE_TEMPLATE, {
        item_options: simple_item_options,
        ac_options: simple_ac_options,
        dirty: {}
      });
      item = getMassItem(element,0);
      spyOn(simple_item_options, 'on_attach');
      expect(simple_item_options.on_attach).not.toHaveBeenCalled();
      focusElement(item);
      expect(simple_item_options.on_attach).not.toHaveBeenCalled();
      setTimeout(done,simple_ac_options.debounce_attach + 1);
    });

    it("should invoke on_attach when focusing input", function(done) {
      expect(simple_item_options.on_attach).toHaveBeenCalled();
      expect(item).toHaveFocus();
      done();
    });

  });

  describe("MassAutoComplete - Suggest", function () {
    var element, item, scope;

    beforeEach(function(done) {
      element = getMassCompiledElement(SIMPLE_TEMPLATE, {
        item_options: simple_item_options,
        ac_options: simple_ac_options,
        dirty:{}
      });
      scope = element.scope();
      item = getMassItem(element,0);
      // spyOn(simple_item_options, 'suggest');
      focusElement(item);

      setTimeout(function() {
        scope.dirty.value = 'A';
        scope.$apply();
        setTimeout(done, simple_ac_options.debounce_suggest + simple_ac_options.debounce_position + 1);
      }, simple_ac_options.debounce_attach + 1);

    });

    it("should display suggestions in the ac box", function(done) {
      // expect(simple_item_options.suggest).toHaveBeenCalled();
      timeout();
      expect(element).toHaveNChildren(3);
      expect(item).toHaveFocus();
      done();
    });

  });

});
