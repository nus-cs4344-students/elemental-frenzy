/*global module:false */


//     Quintus Game Engine
//     (c) 2012 Pascal Rettig, Cykod LLC
//     Quintus may be freely distributed under the MIT license or GPLv2 License.
//     For all details and documentation:
//     http://html5quintus.com
//
/**
Quintus HTML5 Game Engine

The code in `quintus.js` defines the base `Quintus()` method
which create an instance of the engine. The basic engine doesn't
do a whole lot - it provides an architecture for extension, a
game loop, and a method for creating or binding to an exsiting
canvas context. The engine has dependencies on Underscore.js and jQuery,
although the jQuery dependency will be removed in the future.

Most of the game-specific functionality is in the
various other modules:

* `quintus_input.js` - `Input` module, which allows for user input via keyboard and touchscreen
* `quintus_sprites.js` - `Sprites` module, which defines a basic `Q.Sprite` class along with spritesheet support in `Q.SpriteSheet`.
* `quintus_scenes.js` - `Scenes` module. It defines the `Q.Scene` class, which allows creation of reusable scenes, and the `Q.Stage` class, which handles managing a number of sprites at once.
* `quintus_anim.js` - `Anim` module, which adds in support for animations on sprites along with a `viewport` component to follow the player around and a `Q.Repeater` class that can create a repeating, scrolling background.

@module Quintus
*/

var quintusCore = function(window,key) { 
  "use strict";

/**
 Top-level Quintus engine factory wrapper,
 creates new instances of the engine by calling:

      var Q = Quintus({  ...  });

 Any initial setup methods also all return the `Q` object, allowing any initial
 setup calls to be chained together.

      var Q = Quintus()
              .include("Input, Sprites, Scenes")
              .setup('quintus', { maximize: true })
              .controls();

 `Q` is used internally as the object name, and is used in most of the examples,
 but multiple instances of the engine on the same page can have different names.

     var Game1 = Quintus(), Game2 = Quintus();

@class Quintus
**/
var Quintus = window[key] = function(opts) {

  /**
   A la jQuery - the returned `Q` object is actually
   a method that calls `Q.select`. `Q.select` doesn't do anything
   initially, but can be overridden by a module to allow
   selection of game objects. The `Scenes` module adds in
   the select method which selects from the default stage.

       var Q = Quintus().include("Sprites, Scenes");
       ... Game Code ...
       // Set the angry property on all Enemy1 class objects to true
       Q("Enemy1").p({ angry: true });

    @method Q
    @for Quintus
  */
  var Q = function(selector,scope,options) {
    return Q.select(selector,scope,options);
  };

  /**
   Default no-op select method. Replaced with the Quintus.Scene class

   @method Q.select
   @for Quintus
  */
  Q.select = function() { /* No-op */ };

  /**
   Default no-op select method. Replaced with the Quintus.Scene class


   Syntax for including other modules into quintus, can accept a comma-separated
   list of strings, an array of strings, or an array of actual objects. Example:

       Q.include("Input, Sprites, Scenes")

   @method Q.include
   @param {String} mod - A comma separated list of module names
   @return {Quintus} returns Quintus instance for chaining.
   @for Quintus
  */
  Q.include = function(mod) {
    Q._each(Q._normalizeArg(mod),function(name) {
      var m = Quintus[name] || name;
      if(!Q._isFunction(m)) { throw "Invalid Module:" + name; }
      m(Q);
    });
    return Q;
  };

  /**
   An internal utility method (utility methods are prefixed with underscores)
   It's used to take a string of comma separated names and turn it into an `Array`
   of names. If an array of names is passed in, it's left as is. Example usage:

       Q._normalizeArg("Sprites, Scenes, Physics   ");
       // returns [ "Sprites", "Scenes", "Physics" ]

   Used by `Q.include` and `Q.Sprite.add` to add modules and components, respectively.

   Most of these utility methods are a subset of Underscore.js,
   Most are pulled directly from underscore and some are
   occasionally optimized for speed and memory usage in lieu of flexibility.

   Underscore.js is (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.

   Underscore is freely distributable under the MIT license.

   http://underscorejs.org

   @method Q._normalizeArg
   @param {String or Array} arg - Either a comma separated string or an array
   @return {Array} array of normalized names
   @for Quintus
  */
  Q._normalizeArg = function(arg) {
    if(Q._isString(arg)) {
      arg = arg.replace(/\s+/g,'').split(",");
    }
    if(!Q._isArray(arg)) {
      arg = [ arg ];
    }
    return arg;
  };


  /**
   Extends a destination object with a source object (modifies destination object)

   @method Q._extend
   @param {Object} dest - destination object
   @param {Object} source - source object
   @return {Object} returns the dest object
   @for Quintus
  */
  Q._extend = function(dest,source) {
    if(!source) { return dest; }
    for (var prop in source) {
      dest[prop] = source[prop];
    }
    return dest;
  };

  /**
   Return a shallow copy of an object. Sub-objects (and sub-arrays) are not cloned. (uses extend internally)

   @method Q._clone
   @param {Object} obj - object to clone
   @return {Object} cloned object
   @for Quintus
  */
  Q._clone = function(obj) {
    return Q._extend({},obj);
  };

   /**
    Method that adds default properties onto an object only if the key on dest is undefined

   @method Q._defaults
   @param {Object} dest - destination object
   @param {Object} source - source object
   @return {Object} returns the dest object
   @for Quintus
  */
  Q._defaults = function(dest,source) {
    if(!source) { return dest; }
    for (var prop in source) {
      if(dest[prop] === void 0) {
        dest[prop] = source[prop];
      }
    }
    return dest;
  };

  /**
   Shortcut for hasOwnProperty

   @method Q._defaults
   @param {Object} object - destination object
   @param {String} key - key to check for
   @return {Boolean}
   @for Quintus
  */
  Q._has = function(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };

   /**
   Check if something is a string

   NOTE: this fails for non-primitives

   @method Q._isString
   @param {Var} obj - object to check
   @return {Boolean}
   @for Quintus
  */
  Q._isString = function(obj) {
    return typeof obj === "string";
  };

  /**
   Check if something is a number

   @method Q._isNumber
   @param {Var} obj - object to check
   @return {Boolean}
   @for Quintus
  */
  Q._isNumber = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Number]';
  };

  /**
   Check if something is a function

   @method Q._isFunction
   @param {Var} obj - object to check
   @return {Boolean}
   @for Quintus
  */
  Q._isFunction = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  };

   /**
   Check if something is an Object

   @method Q._isObject
   @param {Var} obj - object to check
   @return {Boolean}
   @for Quintus
  */
  Q._isObject = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
  };

  /**
   Check if something is an Array

   @method Q._isArray
   @param {Var} obj - object to check
   @return {Boolean}
   @for Quintus
  */
  Q._isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   Check if something is undefined

   @method Q._isUndefined
   @param {Var} obj - object to check
   @return {Boolean}
   @for Quintus
  */
  Q._isUndefined = function(obj) {
    return obj === void 0;
  };

  /**
   Removes a property from an object and returns it if it exists

   @method Q._popProperty
   @param {Object} obj
   @param {String} property - property to pop off the object
   @return {Var} popped property
   @for Quintus
  */
  Q._popProperty = function(obj,property) {
    var val = obj[property];
    delete obj[property];
    return val;
  };

  /**
   Basic iteration method. This can often be a performance
   handicap when the callback iterator is created inline,
   as this leads to lots of functions that need to be GC'd.
   Better is to define the iterator as a private method so.
   Uses the built in `forEach` method

   @method Q._each
   @param {Array or Object} obj
   @param {Function iterator function, `this` is used for each object
   @for Quintus
  */
  Q._each = function(obj,iterator,context) {
    if (obj == null) { return; }
    if (obj.forEach) {
      obj.forEach(iterator,context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        iterator.call(context, obj[i], i, obj);
      }
    } else {
      for (var key in obj) {
        iterator.call(context, obj[key], key, obj);
      }
    }
  };

  /**
   Invoke the named property on each element of the array

   @method Q._invoke
   @param {Array} arr
   @param {String} property - property to invoke
   @param {Var} [arg1]
   @param {Var} [arg2]
   @for Quintus
  */
  Q._invoke = function(arr,property,arg1,arg2) {
    if (arr === null) { return; }
    for (var i = 0, l = arr.length; i < l; i++) {
      arr[i][property](arg1,arg2);
    }
  };



  /**
   Basic detection method, returns the first instance where the
   iterator returns truthy.

   @method Q._detect
   @param {Array or Object} obj
   @param {Function} iterator
   @param {Object} context
   @param {Var} [arg1]
   @param {Var} [arg2]
   @returns {Var} first truthy value
   @for Quintus
  */
  Q._detect = function(obj,iterator,context,arg1,arg2) {
    var result;
    if (obj === null) { return; }
    if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        result = iterator.call(context, obj[i], i, arg1,arg2);
        if(result) { return result; }
      }
      return false;
    } else {
      for (var key in obj) {
        result = iterator.call(context, obj[key], key, arg1,arg2);
        if(result) { return result; }
      }
      return false;
    }
  };

  /**
   Returns a new Array with entries set to the return value of the iterator.

   @method Q._detect
   @param {Array or Object} obj
   @param {Function} iterator
   @param {Object} context
   @returns {Array}
   @for Quintus
  */
  Q._map = function(obj, iterator, context) {
    var results = [];
    if (obj === null) { return results; }
    if (obj.map) { return obj.map(iterator, context); }
    Q._each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) { results.length = obj.length; }
    return results;
  };

  /**
   Returns a sorted copy of unique array elements with null removed

   @method Q._uniq
   @param {Array} arr
   @returns {Array} uniq'd sorted copy of array
   @for Quintus
  */
  Q._uniq = function(arr) {
    arr = arr.slice().sort();

    var output = [];

    var last = null;
    for(var i=0;i<arr.length;i++) {
      if(arr[i] !== void 0 && last !== arr[i]) {
        output.push(arr[i]);
      }
      last = arr[i];
    }
    return output;
  };

  /**
   Returns a new array with the same entries as the source but in a random order.

   @method Q._shuffle
   @param {Array} arr
   @returns {Array} copy or arr in shuffled order
   @for Quintus
  */
  Q._shuffle = function(obj) {
    var shuffled = [], rand;
    Q._each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };


  /**
   Return an object's keys as a new Array

   @method Q._keys
   @param {Object} obj
   @returns {Array}
   @for Quintus
  */
  Q._keys = Object.keys || function(obj) {
    if(Q._isObject(obj)) { throw new TypeError('Invalid object'); }
    var keys = [];
    for (var key in obj) { if (Q._has(obj, key)) { keys[keys.length] = key; } }
    return keys;
  };


  /**
   Return an array in the range from start to stop

   @method Q._range
   @param {Integer} start
   @param {Integer} stop
   @param {Integer} [step]
   @returns {Array}
   @for Quintus
  */
  Q._range = function(start,stop,step) {
    step = step || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;

  };

  var idIndex = 0;
  /**
   Return a new unique identifier

   @method Q._uniqueId
   @returns {Integer}
   @for Quintus
  */
  Q._uniqueId = function() {
    return idIndex++;
  };



  /**
   Options

   Default engine options defining the paths
   where images, audio and other data files should be found
   relative to the base HTML file. As well as a couple of other
   options.

   These can be overriden by passing in options to the `Quintus()`
   factory method, for example:

       // Override the imagePath to default to /assets/images/
       var Q = Quintus({ imagePath: "/assets/images/" });

   If you follow the default convention from the examples, however,
   you should be able to call `Quintus()` without any options.

   Default Options

       {
        imagePath: "images/",
        audioPath: "audio/",
        dataPath:  "data/",
        audioSupported: [ 'mp3','ogg' ],
        sound: true,
        frameTimeLimit: 100
       }

   @property Q.options
   @type Object
   @for Quintus
  */
  Q.options = {
    imagePath: "images/",
    audioPath: "audio/",
    dataPath:  "data/",
    audioSupported: [ 'mp3','ogg' ],
    sound: true,
    frameTimeLimit: 100,
    autoFocus: true
  };
  if(opts) { Q._extend(Q.options,opts); }

  Q.scheduleFrame = function(callback) {
    return window.requestAnimationFrame(callback);
  };

  Q.cancelFrame = function(loop) {
    window.cancelAnimationFrame(loop);
  };

  /**
   Game Loop support

   By default the engine doesn't start a game loop until you actually tell it to.
   Usually the loop is started the first time you call `Q.stageScene`, but if you
   aren't using the `Scenes` module you can explicitly start the game loop yourself
   and control **exactly** what the engine does each cycle. For example:

       var Q = Quintus().setup();

       var ball = new Q.Sprite({ .. });

       Q.gameLoop(function(dt) {
         Q.clear();
         ball.step(dt);
         ball.draw(Q.ctx);
       });

   The callback will be called with fraction of a second that has elapsed since
   the last call to the loop method.

   @method Q.gameLoop
   @param {Function} callback
   @for Quintus
  */
  Q.gameLoop = function(callback) {
    Q.lastGameLoopFrame = new Date().getTime();

    // Short circuit the loop check in case multiple scenes
    // are staged immediately
    Q.loop = true;

    // Keep track of the frame we are on (so that animations can be synced
    // to the next frame)
    Q._loopFrame = 0;

    // Wrap the callback to save it and standardize the passed
    // in time.
    Q.gameLoopCallbackWrapper = function() {
      var now = new Date().getTime();
      Q._loopFrame++;
      Q.loop = Q.scheduleFrame(Q.gameLoopCallbackWrapper);
      var dt = now - Q.lastGameLoopFrame;
      /* Prevent fast-forwarding by limiting the length of a single frame. */
      if(dt > Q.options.frameTimeLimit) { dt = Q.options.frameTimeLimit; }
      callback.apply(Q,[dt / 1000]);
      Q.lastGameLoopFrame = now;
    };

    Q.scheduleFrame(Q.gameLoopCallbackWrapper);
    return Q;
  };




  /**
   Pause the entire game by canceling the requestAnimationFrame call. If you use setTimeout or
   setInterval in your game, those will, of course, keep on rolling...

    @method Q.pauseGame
    @for Quintus
  */
  Q.pauseGame = function() {
    if(Q.loop) {
      Q.cancelFrame(Q.loop);
    }
    Q.loop = null;
  };

  /**
   Unpause the game by restarting the requestAnimationFrame-based loop.
   Pause the entire game by canceling the requestAnimationFrame call. If you use setTimeout or
   setInterval in your game, those will, of course, keep on rolling...

    @method Q.pauseGame
    @for Quintus
  */
  Q.unpauseGame = function() {
    if(!Q.loop) {
      Q.lastGameLoopFrame = new Date().getTime();
      Q.loop = Q.scheduleFrame(Q.gameLoopCallbackWrapper);
    }
  };


  /**
   The base Class object

   Quintus uses the Simple JavaScript inheritance Class object, created by
   John Resig and described on his blog:

   [http://ejohn.org/blog/simple-javascript-inheritance/](http://ejohn.org/blog/simple-javascript-inheritance/)

   The class is used wholesale, with the only differences being that instead
   of appearing in a top-level namespace, the `Class` object is available as
   `Q.Class` and a second argument on the `extend` method allows for adding
   class level methods and the class name is passed in a parameter for introspection
   purposes.

   Classes can be created by calling `Q.Class.extend(name,{ .. })`, although most of the time
   you'll want to use one of the derivitive classes, `Q.Evented` or `Q.GameObject` which
   have a little bit of functionality built-in. `Q.Evented` adds event binding and
   triggering support and `Q.GameObject` adds support for components and a destroy method.

   The main things Q.Class get you are easy inheritance, a constructor method called `init()`,
   dynamic addition of a this._super method when a method is overloaded (be careful with
   this as it adds some overhead to method calls.) Calls to `instanceof` also all
   work as you'd hope.

   By convention, classes should be added onto to the `Q` object and capitalized, so if
   you wanted to create a new class for your game, you'd write:

       Q.Class.extend("MyClass",{ ... });

   Examples:

       Q.Class.extend("Bird",{
         init: function(name) { this.name = name; },
         speak: function() { console.log(this.name); },
         fly: function()   { console.log("Flying"); }
       });

       Q.Bird.extend("Penguin",{
         speak: function() { console.log(this.name + " the penguin"); },
         fly: function()   { console.log("Can't fly, sorry..."); }
       });

       var randomBird = new Q.Bird("Frank"),
           pengy      = new Q.Penguin("Pengy");

       randomBird.fly(); // Logs "Flying"
       pengy.fly();      // Logs "Can't fly,sorry..."

       randomBird.speak(); // Logs "Frank"
       pengy.speak();      // Logs "Pengy the penguin"

       console.log(randomBird instanceof Q.Bird);    // true
       console.log(randomBird instanceof Q.Penguin); // false
       console.log(pengy instanceof Q.Bird);         // true
       console.log(pengy instanceof Q.Penguin);      // true

  Simple JavaScript Inheritance
  By John Resig http://ejohn.org/
  MIT Licensed.

  Inspired by base2 and Prototype
  @class Q.Class
  @for Quintus
  */
  (function(){
    var initializing = false,
        fnTest = /xyz/.test(function(){ var xyz;}) ? /\b_super\b/ : /.*/;
    /** The base Class implementation (does nothing)
     *
     * @constructor
     * @for Q.Class
     */
    Q.Class = function(){};

    /**
     * See if a object is a specific class
     *
     * @method isA
     * @param {String} className - class to check against
     */
    Q.Class.prototype.isA = function(className) {
      return this.className === className;
    };

    /**
     * Create a new Class that inherits from this class
     *
     * @method extend
     * @param {String} className
     * @param {Object} properties - hash of properties (init will be the constructor)
     * @param {Object} [classMethods] - optional class methods to add to the class
     */
    Q.Class.extend = function(className, prop, classMethods) {
      /* No name, don't add onto Q */
      if(!Q._isString(className)) {
        classMethods = prop;
        prop = className;
        className = null;
      }
      var _super = this.prototype,
          ThisClass = this;

      /* Instantiate a base class (but only create the instance, */
      /* don't run the init constructor) */
      initializing = true;
      var prototype = new ThisClass();
      initializing = false;

      function _superFactory(name,fn) {
        return function() {
          var tmp = this._super;

          /* Add a new ._super() method that is the same method */
          /* but on the super-class */
          this._super = _super[name];

          /* The method only need to be bound temporarily, so we */
          /* remove it when we're done executing */
          var ret = fn.apply(this, arguments);
          this._super = tmp;

          return ret;
        };
      }

      /* Copy the properties over onto the new prototype */
      for (var name in prop) {
        /* Check if we're overwriting an existing function */
        prototype[name] = typeof prop[name] === "function" &&
          typeof _super[name] === "function" &&
            fnTest.test(prop[name]) ?
              _superFactory(name,prop[name]) :
              prop[name];
      }

      /* The dummy class constructor */
      function Class() {
        /* All construction is actually done in the init method */
        if ( !initializing && this.init ) {
          this.init.apply(this, arguments);
        }
      }

      /* Populate our constructed prototype object */
      Class.prototype = prototype;

      /* Enforce the constructor to be what we expect */
      Class.prototype.constructor = Class;
      /* And make this class extendable */
      Class.extend = Q.Class.extend;

      /* If there are class-level Methods, add them to the class */
      if(classMethods) {
        Q._extend(Class,classMethods);
      }

      if(className) {
        /* Save the class onto Q */
        Q[className] = Class;

        /* Let the class know its name */
        Class.prototype.className = className;
        Class.className = className;
      }

      return Class;
    };
  }());


  // Event Handling
  // ==============

  /**
   The `Q.Evented` class adds event handling onto the base `Q.Class`
   class. Q.Evented objects can trigger events and other objects can
   bind to those events.

   @class Q.Evented
   @extends Q.Class
   @for Quintus
  */
  Q.Class.extend("Evented",{

    /**
    Binds a callback to an event on this object. If you provide a
    `target` object, that object will add this event to it's list of
    binds, allowing it to automatically remove it when it is destroyed.

    @method on
    @for Q.Evented
    @param {String} event - name or comma separated list of events
    @param {Object} [target] - optional context for callback, defaults to the Evented
    @param {Function} [callback] - callback (optional - defaults to name of event on context
    */
    on: function(event,target,callback) {
      if(Q._isArray(event) || event.indexOf(",") !== -1) {
        event = Q._normalizeArg(event);
        for(var i=0;i<event.length;i++) {
          this.on(event[i],target,callback);
        }
        return;
      }

      // Handle the case where there is no target provided,
      // swapping the target and callback parameters.
      if(!callback) {
        callback = target;
        target = null;
      }

      // If there's still no callback, default to the event name
      if(!callback) {
        callback = event;
      }
      // Handle case for callback that is a string, this will
      // pull the callback from the target object or from this
      // object.
      if(Q._isString(callback)) {
        callback = (target || this)[callback];
      }

      // To keep `Q.Evented` objects from needing a constructor,
      // the `listeners` object is created on the fly as needed.
      // `listeners` keeps a list of callbacks indexed by event name
      // for quick lookup.
      this.listeners = this.listeners || {};
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push([ target || this, callback]);

      // With a provided target, the target object keeps track of
      // the events it is bound to, which allows for automatic
      // unbinding on destroy.
      if(target) {
        if(!target.binds) { target.binds = []; }
        target.binds.push([this,event,callback]);
      }
    },

    /**
     Triggers an event, passing in some optional additional data about
     the event.

    @method trigger
    @for Q.Evented
    @param {String} event - name of event
    @param {Object} [data] - optional data to pass to the callback
    */
    trigger: function(event,data) {
      // First make sure there are any listeners, then check for any listeners
      // on this specific event, if not, early out.
      if(this.listeners && this.listeners[event]) {
        // Call each listener in the context of either the target passed into
        // `on` or the object itself.
        for(var i=0,len = this.listeners[event].length;i<len;i++) {
          var listener = this.listeners[event][i];
          listener[1].call(listener[0],data);
        }
      }
    },

    /**
      Unbinds an event. Can be called with 1, 2, or 3 parameters, each
       of which unbinds a more specific listener.

    @method off
    @for Q.Evented
    @param {String} event - name of event
    @param {Object} [target] - optionally limit to a specific target
    @param {Function} [callback] - optionally limit to one specific callback
    */
    off: function(event,target,callback) {
      // Without a target, remove all the listeners.
      if(!target) {
        if(this.listeners[event]) {
          delete this.listeners[event];
        }
      } else {
        // If the callback is a string, find a method of the
        // same name on the target.
        if(Q._isString(callback) && target[callback]) {
          callback = target[callback];
        }
        var l = this.listeners && this.listeners[event];
        if(l) {
          // Loop from the end to the beginning, which allows us
          // to remove elements without having to affect the loop.
          for(var i = l.length-1;i>=0;i--) {
            if(l[i][0] === target) {
              if(!callback || callback === l[i][1]) {
                this.listeners[event].splice(i,1);
              }
            }
          }
        }
      }
    },

    /**
     `debind` is called to remove any listeners an object had
     on other objects. The most common case is when an object is
     destroyed you'll want all the event listeners to be removed
     for you.

    @method debind
    @for Q.Evented
    */
    debind: function() {
       if(this.binds) {
         for(var i=0,len=this.binds.length;i<len;i++) {
           var boundEvent = this.binds[i],
               source = boundEvent[0],
               event = boundEvent[1];
           source.off(event,this);
         }
       }
     }

   });





  /**
   The master list of registered components, indexed in an object by name.

   @property Q.components
   @type Object
   @for Quintus
  */
  Q.components = {};

  /**
   Components
   ==============

   Components are self-contained pieces of functionality that can be added onto and removed
   from objects. The allow for a more dynamic functionality tree than using inheritance (i.e.
   by favoring composition over inheritance) and are added and removed on the fly at runtime.
   (yes, I know everything in JS is at runtime, but you know what I mean, geez)

   Combining components with events makes it easy to create reusable pieces of
   functionality that can be decoupled from each other.

   The base class for components. These are usually not derived directly but are instead
   created by calling `Q.register` to register a new component given a set of methods the
   component supports. Components are created automatically when they are added to a
   `Q.GameObject` with the `add` method.

   Many components also define an `added` method, which is called automatically by the
   `init` constructor after a component has been added to an object. This is a good time
   to add event listeners on the object.

   @class Q.Component
   @events Q.Evented
   @for Quintus
  */
  Q.Evented.extend("Component",{

    // Components are created when they are added onto a `Q.GameObject` entity. The entity
    // is directly extended with any methods inside of an `extend` property and then the
    // component itself is added onto the entity as well.
    init: function(entity) {
      this.entity = entity;
      if(this.extend) { Q._extend(entity,this.extend);   }
      entity[this.name] = this;

      entity.activeComponents.push(this.componentName);

      if(entity.stage && entity.stage.addToList) {
        entity.stage.addToList(this.componentName,entity);
      }
      if(this.added) { this.added(); }
    },

    /**
     `destroy` is called automatically when a component is removed from an entity. It is
     not called, however, when an entity is destroyed (for performance reasons).

     It's job is to remove any methods that were added with `extend` and then remove and
     debind itself from the entity. It will also call `destroyed` if the component has
     a method by that name.

     @method destroy
     @for Q.Component
    */
    destroy: function() {
      if(this.extend) {
        var extensions = Q._keys(this.extend);
        for(var i=0,len=extensions.length;i<len;i++) {
          delete this.entity[extensions[i]];
        }
      }
      delete this.entity[this.name];
      var idx = this.entity.activeComponents.indexOf(this.componentName);
      if(idx !== -1) {
        this.entity.activeComponents.splice(idx,1);

        if(this.entity.stage && this.entity.stage.addToList) {
          this.entity.stage.addToLists(this.componentName,this.entity);
        }
      }
      this.debind();
      if(this.destroyed) { this.destroyed(); }
    }
  });

  /**

    Game Objects
    ============

   This is the base class most Quintus objects are derived from, it extends
   `Q.Evented` and adds component support to an object, allowing components to
   be added and removed from an object. It also defines a destroyed method
   which will debind the object, remove it from it's parent (usually a scene)
   if it has one, and trigger a destroyed event.

   @class Q.GameObject
   @extends Q.Evented
   @for Quintus
  */
  Q.Evented.extend("GameObject",{

    /**
     Simple check to see if a component already exists
     on an object by searching for a property of the same name.

     @method has
     @for Q.GameObject
     @param {String} component - name of component to test against
     @returns {Boolean}
    */
    has: function(component) {
      return this[component] ? true : false;
    },

    /**
     Adds one or more components to an object. Accepts either
     a comma separated string or an array of strings that map
     to component names.

     Instantiates a new component object of the correct type
     (if the component exists) and then triggers an addComponent
     event.

     For example:

         this.add("2d, aiBounce")

     Returns the object to allow chaining.

     @for Q.GameObject
     @method add
     @param {String} components - comma separated list of components to add
     @return {Object} returns this for chaining purposes
    */
    add: function(components) {
      components = Q._normalizeArg(components);
      if(!this.activeComponents) { this.activeComponents = []; }
      for(var i=0,len=components.length;i<len;i++) {
        var name = components[i],
            Comp = Q.components[name];
        if(!this.has(name) && Comp) {
          var c = new Comp(this);
          this.trigger('addComponent',c);
        }
      }
      return this;
    },

    /**
     Removes one or more components from an object. Accepts the
     same style of parameters as `add`. Triggers a delComponent event
     and calls destroy on the component.

     Returns the element to allow chaining.

     @for Q.GameObject
     @method del
     @param {String} components - comma separated list of components to remove
     @return {Object} returns this for chaining purposes
    */
    del: function(components) {
      components = Q._normalizeArg(components);
      for(var i=0,len=components.length;i<len;i++) {
        var name = components[i];
        if(name && this.has(name)) {
          this.trigger('delComponent',this[name]);
          this[name].destroy();
        }
      }
      return this;
    },

    /**
     Destroys the object by calling debind and removing the
     object from it's parent. Will trigger a destroyed event
     callback.

     @for Q.GameObject
     @method del
     @param {String} components - comma separated list of components to remove
     @return {Object} returns this for chaining purposes
    */
    destroy: function() {
      if(this.isDestroyed) { return; }
      this.trigger('destroyed');
      this.debind();
      if(this.stage && this.stage.remove) {
        this.stage.remove(this);
      }
      this.isDestroyed = true;
      if(this.destroyed) { this.destroyed(); }
    }
  });

  /**
   Registers a component with the engine, making it available to `Q.GameObject`'s
   This creates a new descendent class of `Q.Component` with new methods added in.

   @for Quintus
   @method Q.component
   @param {String} name - component name
   @param {Object} metehods - hash of methods for the component
  */
  Q.component = function(name,methods) {
    if(!methods) { return Q.components[name]; }
    methods.name = name;
    methods.componentName = "." + name;
    return (Q.components[name] = Q.Component.extend(name + "Component",methods));
  };


  /**
   Generic Game State object that can be used to
   track of the current state of the Game, for example when the player starts
   a new game you might want to keep track of their score and remaining lives:

       Q.reset({ score: 0, lives: 2 });

   Then in your game might want to add to the score:

        Q.state.inc("score",50);

   In your hud, you can listen for change events on the state to update your
   display:

        Q.state.on("change.score",function() { .. update the score display .. });

  @class Q.GameState
  @extends Q.GameObject
  */
  Q.GameObject.extend("GameState",{
    init: function(p) {
      this.p = Q._extend({},p);
      this.listeners = {};
    },


    /**
     Resets the state to value p, triggers a reset event.

     @method reset
     @param {Object} p - properties to reinitialize to
    */
    reset: function(p) { this.init(p); this.trigger("reset"); },

    // Internal helper method to set an individual property
    _triggerProperty: function(value,key) {
      if(this.p[key] !== value) {
        this.p[key] = value;
        this.trigger("change." + key,value);
      }
    },

    /**
     Set one or more properties, trigger events on those
     properties changing.

     @example
        Q.state.set({ lives: 5, hitPoints: 4 });
        // Triggers 3 events: change.lives, change.hitPoints, change


        Q.state.set("lives",5);
        // Triggers 2 events: change.lives, change

    @method set
    @param {Object or String} properties - hash of properties to set, or property name
    @param {Var} [value] - if setting 1 property, the value of that property
    */
    set: function(properties,value) {
      if(Q._isObject(properties)) {
        Q._each(properties,this._triggerProperty,this);
      } else {
        this._triggerProperty(value,properties);
      }
      this.trigger("change");
    },

    /**
     Increment an individual property by amount, uses set internally

     @method inc
     @param {String} property
     @param {Integer} amount - amount to increment by
    */
    inc: function(property,amount) {
      this.set(property,this.get(property) + amount);
    },

    /**

     Increment an individual property by amount, uses set internally

     @method dec
     @param {String} property
     @param {Integer} amount - amount to decrement by
    */
    dec: function(property,amount) {
      this.set(property,this.get(property) - amount);
    },

    /**

     Return an individual property

     @method get
     @param {String} property
     @return {Var} value of the property
    */
    get: function(property) {
      return this.p[property];
    }
  });

  /**
   Top-level `Q.GameState` instance, generally used for global state in the game

   @for Quintus
   @property Q.state
   @type Q.GameState
  */
  Q.state = new Q.GameState();

  /**
   Reset the global game state

   @for Quintus
   @method Q.reset
  */
  Q.reset = function() { Q.state.reset(); };




  Q.touchDevice = (typeof exports === 'undefined') && ('ontouchstart' in document);

  /**

   Canvas Methods

   The `setup` and `clear` method are the only two canvas-specific methods in
   the core of Quintus. `imageData`  also uses canvas but it can be used in
   any type of game.

   Setup will either create a new canvas element and append it
   to the body of the document or use an existing one. It will then
   pull out the width and height of the canvas for engine use.

   It also adds a wrapper container around the element.

   If the `maximize` is set to true, the canvas element is maximized
   on the page and the scroll trick is used to try to get the address bar away.

   The engine will also resample the game to CSS dimensions at twice pixel
   dimensions if the `resampleWidth` or `resampleHeight` options are set.

   TODO: add support for auto-resize w/ engine event notifications

   Available options:

       {
        width: 320,  // width of created canvas
        height: 420, // height of created canvas
        maximize: false // set to true to maximize to screen, "touch" to maximize on touch devices
       }

   @for Quintus
   @method Q.setup
   @param {String} [id="quintus"] - id of the canvas element to trigger quintus on
   @param {Object} [options] - options hash

  */
  Q.setup = function(id, options) {
    if(Q._isObject(id)) {
      options = id;
      id = null;
    }
    options = options || {};
    id = id || "quintus";

    if(Q._isString(id)) {
      Q.el = document.getElementById(id);
    } else {
      Q.el = id;
    }

    if(!Q.el) {
      Q.el = document.createElement("canvas");
      Q.el.width = options.width || 320;
      Q.el.height = options.height || 420;
      Q.el.id = id;

      document.body.appendChild(Q.el);
    }

    var w = parseInt(Q.el.width,10),
        h = parseInt(Q.el.height,10);

    var maxWidth = options.maxWidth || 5000,
        maxHeight = options.maxHeight || 5000,
        resampleWidth = options.resampleWidth,
        resampleHeight = options.resampleHeight,
        upsampleWidth = options.upsampleWidth,
        upsampleHeight = options.upsampleHeight;

    if(options.maximize === true || (Q.touchDevice && options.maximize === 'touch'))  {
      document.body.style.padding = 0;
      document.body.style.margin = 0;

      w = options.width || Math.min(window.innerWidth,maxWidth) - ((options.pagescroll)?17:0);
      h = options.height || Math.min(window.innerHeight - 5,maxHeight);

      if(Q.touchDevice) {
        Q.el.style.height = (h*2) + "px";
        window.scrollTo(0,1);

        w = Math.min(window.innerWidth,maxWidth);
        h = Math.min(window.innerHeight,maxHeight);
      }
    } else if(Q.touchDevice) {
      window.scrollTo(0,1);
    }

    if((upsampleWidth && w <= upsampleWidth) ||
       (upsampleHeight && h <= upsampleHeight)) {
      Q.el.style.height = h + "px";
      Q.el.style.width = w + "px";
      Q.el.width = w * 2;
      Q.el.height = h * 2;
    }
    else if(((resampleWidth && w > resampleWidth) ||
        (resampleHeight && h > resampleHeight)) &&
       Q.touchDevice) {
      Q.el.style.height = h + "px";
      Q.el.style.width = w + "px";
      Q.el.width = w / 2;
      Q.el.height = h / 2;
    } else {
      Q.el.style.height = h + "px";
      Q.el.style.width = w + "px";
      Q.el.width = w;
      Q.el.height = h;
    }

    var elParent = Q.el.parentNode;

    if(elParent && !Q.wrapper) {
      Q.wrapper = document.createElement("div");
      Q.wrapper.id = Q.el.id + '_container';
      Q.wrapper.style.width = w + "px";
      Q.wrapper.style.margin = "0 auto";
      Q.wrapper.style.position = "relative";


      elParent.insertBefore(Q.wrapper,Q.el);
      Q.wrapper.appendChild(Q.el);
    }

    Q.el.style.position = 'relative';

    Q.ctx = Q.el.getContext &&
            Q.el.getContext("2d");


    Q.width = parseInt(Q.el.width,10);
    Q.height = parseInt(Q.el.height,10);
    Q.cssWidth = w;
    Q.cssHeight = h;

    //scale to fit
    if(options.scaleToFit) {
      var factor = 1;

      var winW = window.innerWidth*factor;
      var winH = window.innerHeight*factor;
      var winRatio = winW/winH;
      var gameRatio = Q.el.width/Q.el.height;
      var scaleRatio = gameRatio < winRatio ? winH/Q.el.height : winW/Q.el.width;
      var scaledW = Q.el.width * scaleRatio;
      var scaledH = Q.el.height * scaleRatio;

      Q.el.style.width = scaledW + "px";
      Q.el.style.height = scaledH + "px";

      if(Q.el.parentNode) {
        Q.el.parentNode.style.width = scaledW + "px";
        Q.el.parentNode.style.height = scaledH + "px";
      }

      Q.cssWidth = parseInt(scaledW,10);
      Q.cssHeight = parseInt(scaledH,10);

      //center vertically when adjusting to width
      if(gameRatio > winRatio) {
        var topPos = (winH - scaledH)/2;
        Q.el.style.top = topPos+'px';
      }
    }

    window.addEventListener('orientationchange',function() {
      setTimeout(function() { window.scrollTo(0,1); }, 0);
    });

    return Q;
  };


  /**
   Clear the canvas completely.

   If you want it cleared to a specific color - set `Q.clearColor` to that color

   @method Q.clear
   @for Quintus
  */
  Q.clear = function() {
    if(Q.clearColor) {
      Q.ctx.globalAlpha = 1;
      Q.ctx.fillStyle = Q.clearColor;
      Q.ctx.fillRect(0,0,Q.width,Q.height);
    } else {
      Q.ctx.clearRect(0,0,Q.width,Q.height);
    }
  };

  Q.setImageSmoothing = function(enabled) {
    Q.ctx.mozImageSmoothingEnabled = enabled;
    Q.ctx.webkitImageSmoothingEnabled = enabled;
    Q.ctx.msImageSmoothingEnabled = enabled;
    Q.ctx.imageSmoothingEnabled = enabled;
  };

  /**
   Return canvas image data given an Image object.

   @method Q.imageData
   @for Quintus
   @param {Image} img - image to get image data for
  */
  Q.imageData = function(img) {
    var canvas = document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(img,0,0);

    return ctx.getImageData(0,0,img.width,img.height);
  };


  /**
   Asset Loading Support

   The engine supports loading assets of different types using
   `load` or `preload`. Assets are stored by their name so the
   same asset won't be loaded twice if it already exists.

   Augmentable list of asset types, loads a specific asset
   type if the file type matches, otherwise defaults to a Ajax
   load of the data.

   You can new types of assets based on file extension by
   adding to `assetTypes` and adding a method called
   loadAssetTYPENAME where TYPENAME is the name of the
   type you added in.

   Default bindings are:

     * png, jpg, gif, jpeg -> Image
     * ogg, wav, m4a, mp3 -> Audio
     * Everything else -> Data

   To add a new file extension in to an existing type you can just add it to asset types:

       Q.assetTypes['bmp'] = "Image";

   To add in a new loader, you'll need to define a method for that type and add to the `Q.assetTypes` object, e.g.:

       Q.loadAssetVideo = function(key,src,callback,errorCallback) {
          var vid = new Video();
          vid.addEventListener("canplaythrough",function() {  callback(key,vid); });
          vid.onerror = errorCallback;
          vid.src = Q.assetUrl(Q.options.imagePath,src);
       };

       Q.assetTypes['mp4'] = 'Video'


   @for Quintus
   @property Q.assetTypes
   @type Object
  */
  Q.assetTypes = {
    png: 'Image', jpg: 'Image', gif: 'Image', jpeg: 'Image',
    ogg: 'Audio', wav: 'Audio', m4a: 'Audio', mp3: 'Audio'
  };


  /**
   Return the file extension of a filename

   @for Quintus
   @method Q._fileExtension
   @param {String} filename
   @return {String} lowercased extension
  */
  Q._fileExtension = function(filename) {
    var fileParts = filename.split("."),
        fileExt = fileParts[fileParts.length-1].toLowerCase();
    return fileExt;
  };

  /**
   Determine the type of asset based on the `Q.assetTypes` lookup table

   @for Quintus
   @method Q.assetType
   @param {String} asset
  */
  Q.assetType = function(asset) {
    /* Determine the lowercase extension of the file */
    var fileExt = Q._fileExtension(asset);

    // Use the web audio loader instead of the regular loader
    // if it's supported.
    var fileType =  Q.assetTypes[fileExt];
    if(fileType === 'Audio' && Q.audio && Q.audio.type === "WebAudio") {
      fileType = 'WebAudio';
    }

    /* Lookup the asset in the assetTypes hash, or return other */
    return fileType || 'Other';
  };

  /**
   Either return an absolute URL, or add a base to a relative URL

   @for Quintus
   @method Q.assetUrl
   @param {String} base - base for relative paths
   @param {String} url - url to resolve to asset url
   @return {String} resolved url
  */
  Q.assetUrl = function(base,url) {
    var timestamp = "";
    if(Q.options.development) {
      timestamp = (/\?/.test(url) ? "&" : "?") + "_t=" +new Date().getTime();
    }
    if(/^https?:\/\//.test(url) || url[0] === "/") {
      return url + timestamp;
    } else {
      return base + url + timestamp;
    }
  };

  /**
  Loader for Images, creates a new `Image` object and uses the
  load callback to determine the image has been loaded

  @for Quintus
  @method Q.loadAssetImage
  @param {String} key
  @param {String} src
  @param {Function} callback
  @param {Function} errorCallback
  */
  Q.loadAssetImage = function(key,src,callback,errorCallback) {
    var img = new Image();
    img.onload = function() {  callback(key,img); };
    img.onerror = errorCallback;
    img.src = Q.assetUrl(Q.options.imagePath,src);
  };


  // List of mime types given an audio file extension, used to
  // determine what sound types the browser can play using the
  // built-in `Sound.canPlayType`
  Q.audioMimeTypes = { mp3: 'audio/mpeg',
                       ogg: 'audio/ogg; codecs="vorbis"',
                       m4a: 'audio/m4a',
                       wav: 'audio/wav' };


  Q._audioAssetExtension = function() {
    if(Q._audioAssetPreferredExtension) { return Q._audioAssetPreferredExtension; }

    var snd = new Audio();

    /* Find a supported type */
    return Q._audioAssetPreferredExtension =
      Q._detect(Q.options.audioSupported,
         function(extension) {
         return snd.canPlayType(Q.audioMimeTypes[extension]) ?
                                extension : null;
      });
  };


  /**
   Loader for Audio assets. By default chops off the extension and
   will automatically determine which of the supported types is
   playable by the browser and load that type.

   Which types are available are determined by the file extensions
   listed in the Quintus `options.audioSupported`


  @for Quintus
  @method Q.loadAssetAudio
  @param {String} key
  @param {String} src
  @param {Function} callback
  @param {Function} errorCallback
  */
  Q.loadAssetAudio = function(key,src,callback,errorCallback) {
    if(!document.createElement("audio").play || !Q.options.sound) {
      callback(key,null);
      return;
    }

    var baseName = Q._removeExtension(src),
        extension = Q._audioAssetExtension(),
        filename = null,
        snd = new Audio();

    /* No supported audio = trigger ok callback anyway */
    if(!extension) {
      callback(key,null);
      return;
    }

    snd.addEventListener("error",errorCallback);

    // Don't wait for canplaythrough on mobile
    if(!Q.touchDevice) {
      snd.addEventListener('canplaythrough',function() {
        callback(key,snd);
      });
    }
    snd.src =  Q.assetUrl(Q.options.audioPath,baseName + "." + extension);
    snd.load();

    if(Q.touchDevice) {
      callback(key,snd);
    }
  };

  /**
   Asset loader for Audio files if using the WebAudio API engine

  @for Quintus
  @method Q.loadAssetWebAudio
  @param {String} key
  @param {String} src
  @param {Function} callback
  @param {Function} errorCallback
  */
  Q.loadAssetWebAudio = function(key,src,callback,errorCallback) {
    var request = new XMLHttpRequest(),
        baseName = Q._removeExtension(src),
        extension = Q._audioAssetExtension();

    request.open("GET", Q.assetUrl(Q.options.audioPath,baseName + "." + extension), true);
    request.responseType = "arraybuffer";

    // Our asynchronous callback
    request.onload = function() {
      var audioData = request.response;

      Q.audioContext.decodeAudioData(request.response, function(buffer) {
        callback(key,buffer);
      }, errorCallback);
    };
    request.send();

  };

  /**
   Loader for other file types, just stores the data returned from an Ajax call.

   Just makes a Ajax request for all other file types

  @for Quintus
  @method Q.loadAssetOther
  @param {String} key
  @param {String} src
  @param {Function} callback
  @param {Function} errorCallback
  */
  Q.loadAssetOther = function(key,src,callback,errorCallback) {
    var request = new XMLHttpRequest();

    var fileParts = src.split("."),
        fileExt = fileParts[fileParts.length-1].toLowerCase();

    if(document.location.origin === "file://" || document.location.origin === "null") {
      if(!Q.fileURLAlert) {
        Q.fileURLAlert = true;
        alert("Quintus Error: Loading assets is not supported from file:// urls - please run from a local web-server and try again");
      }
      return errorCallback();
    }

    request.onreadystatechange = function() {
      if(request.readyState === 4) {
        if(request.status === 200) {
          if(fileExt === 'json') {
            callback(key,JSON.parse(request.responseText));
          } else {
            callback(key,request.responseText);
          }
        } else {
          errorCallback();
        }
      }
    };

    request.open("GET", Q.assetUrl(Q.options.dataPath,src), true);
    request.send(null);
  };

  /**
   Helper method to return a name without an extension

   @for Quintus
   @method _removeExtension
   @param {String} filename
   @return {String} filename without an extension
  */
  Q._removeExtension = function(filename) {
    return filename.replace(/\.(\w{3,4})$/,"");
  };

  // Asset hash storing any loaded assets
  Q.assets = {};

  /**
   Getter method to return an asset by its name.

   Asset names default to their filenames, but can be overridden
   by passing a hash to `load` to set different names.

   @for Quintus
   @method asset
   @param {String} name - name of asset to lookup
  */
  Q.asset = function(name) {
    return Q.assets[name];
  };

  /**
   Load assets, and call our callback when done.

   Also optionally takes a `progressCallback` which will be called
   with the number of assets loaded and the total number of assets
   to allow showing of a progress.

   Assets can be passed in as an array of file names, and Quintus
   will use the file names as the name for reference, or as a hash of
   `{ name: filename }`.

   Example usage:
       Q.load(['sprites.png','sprites.,json'],function() {
          Q.stageScene("level1"); // or something to start the game.
       });

  @for Quintus
  @method Q.load
  @param {String, Array or Array} assets - comma separated string, array or Object hash of assets to load
  @param {Function} callback - called when done loading
  @param {Object} options
  */
  Q.load = function(assets,callback,options) {
    var assetObj = {};

    /* Make sure we have an options hash to work with */
    if(!options) { options = {}; }

    /* Get our progressCallback if we have one */
    var progressCallback = options.progressCallback;

    var errors = false,
        errorCallback = function(itm) {
          errors = true;
          (options.errorCallback  ||
           function(itm) { throw("Error Loading: " + itm ); })(itm);
        };

    /* Convert to an array if it's a string */
    if(Q._isString(assets)) {
      assets = Q._normalizeArg(assets);
    }

    /* If the user passed in an array, convert it */
    /* to a hash with lookups by filename */
    if(Q._isArray(assets)) {
      Q._each(assets,function(itm) {
        if(Q._isObject(itm)) {
          Q._extend(assetObj,itm);
        } else {
          assetObj[itm] = itm;
        }
      });
    } else {
      /* Otherwise just use the assets as is */
      assetObj = assets;
    }

    /* Find the # of assets we're loading */
    var assetsTotal = Q._keys(assetObj).length,
        assetsRemaining = assetsTotal;

    /* Closure'd per-asset callback gets called */
    /* each time an asset is successfully loaded */
    var loadedCallback = function(key,obj,force) {
      if(errors) { return; }

      // Prevent double callbacks (I'm looking at you Firefox, canplaythrough
      if(!Q.assets[key]||force) {

        /* Add the object to our asset list */
        Q.assets[key] = obj;

        /* We've got one less asset to load */
        assetsRemaining--;

        /* Update our progress if we have it */
        if(progressCallback) {
           progressCallback(assetsTotal - assetsRemaining,assetsTotal);
        }
      }

      /* If we're out of assets, call our full callback */
      /* if there is one */
      if(assetsRemaining === 0 && callback) {
        /* if we haven't set up our canvas element yet, */
        /* assume we're using a canvas with id 'quintus' */
        callback.apply(Q);
      }
    };

    /* Now actually load each asset */
    Q._each(assetObj,function(itm,key) {

      /* Determine the type of the asset */
      var assetType = Q.assetType(itm);

      /* If we already have the asset loaded, */
      /* don't load it again */
      if(Q.assets[key]) {
        loadedCallback(key,Q.assets[key],true);
      } else {
        /* Call the appropriate loader function */
        /* passing in our per-asset callback */
        /* Dropping our asset by name into Q.assets */
        Q["loadAsset" + assetType](key,itm,
                                   loadedCallback,
                                   function() { errorCallback(itm); });
      }
    });

  };

  // Array to store any assets that need to be
  // preloaded
  Q.preloads = [];

  /**
   Let us gather assets to load at a later time,
   and then preload them all at the same time with
   a single callback. Options are passed through to the
   Q.load method if used.

   Example usage:
        Q.preload("sprites.png");
        ...
        Q.preload("sprites.json");
        ...

        Q.preload(function() {
           Q.stageScene("level1"); // or something to start the game
        });
  @for Quintus
  @method Q.preload
  @param {String or Function} arg - comma separated string of assets to load, or callback
  @param {Object} [options] - options to pass to load
  */
  Q.preload = function(arg,options) {
    if(Q._isFunction(arg)) {
      Q.load(Q._uniq(Q.preloads),arg,options);
      Q.preloads = [];
    } else {
      Q.preloads = Q.preloads.concat(arg);
    }
  };


  // Math Methods
  // ==============
  //
  // Math methods, for rotating and scaling points

  // A list of matrices available
  Q.matrices2d = [];

  Q.matrix2d = function() {
    return Q.matrices2d.length > 0 ? Q.matrices2d.pop().identity() : new Q.Matrix2D();
  };

  /**
   A 2D matrix class, optimized for 2D points,
   where the last row of the matrix will always be 0,0,1

   Do not call `new Q.Matrix2D` - use the provided Q.matrix2D factory function for GC happiness

        var matrix = Q.matrix2d();

   Good Docs here: https://github.com/heygrady/transform/wiki/calculating-2d-matrices

   Used internally by Quintus for all transforms / collision detection. Most of the methods modify the matrix they are called upon and are chainable.

   @class Q.Matrix2D
   @for Quintus
   @extends Q.Class
  */
  Q.Matrix2D = Q.Class.extend({
    /**
     Initialize a matrix from a source or with the identify matrix

     @constructor
     @for Q.Matrix2D
    */
    init: function(source) {
      if(source) {
        this.m = [];
        this.clone(source);
      } else {
        this.m = [1,0,0,0,1,0];
      }
    },

    /**
     Turn this matrix into the identity

     @for Q.Matrix2D
     @method identity
     @chainable
    */
    identity: function() {
      var m = this.m;
      m[0] = 1; m[1] = 0; m[2] = 0;
      m[3] = 0; m[4] = 1; m[5] = 0;
      return this;
    },

    /**

     Clone another matrix into this one

     @for Q.Matrix2D
     @method clone
     @param {Q.Matrix2D} matrix - matrix to clone
     @chainable
    */
    clone: function(matrix) {
      var d = this.m, s = matrix.m;
      d[0]=s[0]; d[1]=s[1]; d[2] = s[2];
      d[3]=s[3]; d[4]=s[4]; d[5] = s[5];
      return this;
    },

    /**
     multiply two matrices (leaving the result in this)

        a * b =
           [ [ a11*b11 + a12*b21 ], [ a11*b12 + a12*b22 ], [ a11*b31 + a12*b32 + a13 ] ,
           [ a21*b11 + a22*b21 ], [ a21*b12 + a22*b22 ], [ a21*b31 + a22*b32 + a23 ] ]

     @for Q.Matrix2D
     @method clone
     @param {Q.Matrix2D} matrix - matrix to multiply by
     @chainable
   */
    multiply: function(matrix) {
      var a = this.m, b = matrix.m;

      var m11 = a[0]*b[0] + a[1]*b[3];
      var m12 = a[0]*b[1] + a[1]*b[4];
      var m13 = a[0]*b[2] + a[1]*b[5] + a[2];

      var m21 = a[3]*b[0] + a[4]*b[3];
      var m22 = a[3]*b[1] + a[4]*b[4];
      var m23 = a[3]*b[2] + a[4]*b[5] + a[5];

      a[0]=m11; a[1]=m12; a[2] = m13;
      a[3]=m21; a[4]=m22; a[5] = m23;
      return this;
    },

    /**

     Multiply this matrix by a rotation matrix rotated radians radians

    @for Q.Matrix2D
    @method rotate
    @param {Float} radians - angle to rotate by
    @chainable
    */
    rotate: function(radians) {
      if(radians === 0) { return this; }
      var cos = Math.cos(radians),
          sin = Math.sin(radians),
          m = this.m;

      var m11 = m[0]*cos  + m[1]*sin;
      var m12 = m[0]*-sin + m[1]*cos;

      var m21 = m[3]*cos  + m[4]*sin;
      var m22 = m[3]*-sin + m[4]*cos;

      m[0] = m11; m[1] = m12; // m[2] == m[2]
      m[3] = m21; m[4] = m22; // m[5] == m[5]
      return this;
    },

    /**

     Helper method to rotate by a set number of degrees (calls rotate internally)

     @for Q.Matrix2D
     @method rotateDeg
     @param {Float} degrees
     @chainable
    */
    rotateDeg: function(degrees) {
      if(degrees === 0) { return this; }
      return this.rotate(Math.PI * degrees / 180);
    },

    /**

     Multiply this matrix by a scaling matrix scaling sx and sy
     @for Q.Matrix2D
     @method scale
     @param {Float} sx - scale in x dimension (scaling is uniform unless `sy` is provided)
     @param {Float} [sy] - scale in the y dimension
     @chainable
    */
    scale: function(sx,sy) {
      var m = this.m;
      if(sy === void 0) { sy = sx; }

      m[0] *= sx;
      m[1] *= sy;
      m[3] *= sx;
      m[4] *= sy;
      return this;
    },


    /**
     Multiply this matrix by a translation matrix translate by tx and ty

     @for Q.Matrix2D
     @method translate
     @param {Float} tx
     @param {Float} ty
     @chainable
    */
    translate: function(tx,ty) {
      var m = this.m;

      m[2] += m[0]*tx + m[1]*ty;
      m[5] += m[3]*tx + m[4]*ty;
      return this;
    },


    /**
     Transform x and y coordinates by this matrix
     Memory Hoggy version, returns a new Array

     @for Q.Matrix2D
     @method transform
     @param {Float} x
     @param {Float} y

     */
    transform: function(x,y) {
      return [ x * this.m[0] + y * this.m[1] + this.m[2],
               x * this.m[3] + y * this.m[4] + this.m[5] ];
    },

    /**
     Transform an object with an x and y property by this Matrix
     @for Q.Matrix2D
     @method transformPt
     @param {Object} obj
     @return {Object} obj
    */
    transformPt: function(obj) {
      var x = obj.x, y = obj.y;

      obj.x = x * this.m[0] + y * this.m[1] + this.m[2];
      obj.y = x * this.m[3] + y * this.m[4] + this.m[5];

      return obj;
    },

    /**
     Transform an array with an x and y elements by this Matrix and put the result in
     the outArr

     @for Q.Matrix2D
     @method transformArr
     @param {Array} inArr - input array
     @param {Array} outArr - output array
     @return {Object} obj
    */
    transformArr: function(inArr,outArr) {
      var x = inArr[0], y = inArr[1];

      outArr[0] = x * this.m[0] + y * this.m[1] + this.m[2];
      outArr[1] = x * this.m[3] + y * this.m[4] + this.m[5];

      return outArr;
    },


    /**
     Return just the x coordinate transformed by this Matrix

     @for Q.Matrix2D
     @method transformX
     @param {Float} x
     @param {Float} y
     @return {Float} x transformed
    */
    transformX: function(x,y) {
      return x * this.m[0] + y * this.m[1] + this.m[2];
    },

    /**
     Return just the y coordinate transformed by this Matrix

     @for Q.Matrix2D
     @method transformY
     @param {Float} x
     @param {Float} y
     @return {Float} y transformed
    */
    transformY: function(x,y) {
      return x * this.m[3] + y * this.m[4] + this.m[5];
    },

    /**
     Release this Matrix to be reused

     @for Q.Matrix2D
     @method release
    */
    release: function() {
      Q.matrices2d.push(this);
      return null;
    },

    /**
     Set the complete transform on a Canvas 2D context

     @for Q.Matrix2D
     @method setContextTransform
     @param {Context2D} ctx - 2D canvs context
     */
     setContextTransform: function(ctx) {
      var m = this.m;
      // source:
      //  m[0] m[1] m[2]
      //  m[3] m[4] m[5]
      //  0     0   1
      //
      // destination:
      //  m11  m21  dx
      //  m12  m22  dy
      //  0    0    1
      //  setTransform(m11, m12, m21, m22, dx, dy)
      ctx.transform(m[0],m[3],m[1],m[4],m[2],m[5]);
    }

  });

  // And that's it..
  // ===============
  //
  // Return the `Q` object from the `Quintus()` factory method. Create awesome games. Repeat.
  return Q;
};

// Lastly, add in the `requestAnimationFrame` shim, if necessary. Does nothing
// if `requestAnimationFrame` is already on the `window` object.
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());


return Quintus;
};

if(typeof exports === 'undefined') {
  quintusCore(this,"Quintus");
} else {
  var Quintus = quintusCore(module,"exports");
}


/*global Quintus:false, module:false */

var quintus2D = function(Quintus) {
"use strict";

Quintus["2D"] = function(Q) {

  Q.component('viewport',{
    added: function() {
      this.entity.on('prerender',this,'prerender');
      this.entity.on('render',this,'postrender');
      this.x = 0;
      this.y = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.centerX = Q.width/2;
      this.centerY = Q.height/2;
      this.scale = 1;
    },

    extend: {
      follow: function(sprite,directions,boundingBox) {
        this.off('poststep',this.viewport,'follow');
        this.viewport.directions = directions || { x: true, y: true };
        this.viewport.following = sprite;
        if(Q._isUndefined(boundingBox) && this.lists.TileLayer !== undefined) {
          this.viewport.boundingBox = Q._detect(this.lists.TileLayer, function(layer) {
            return layer.p.boundingBox ? { minX: 0, maxX: layer.p.w, minY: 0, maxY: layer.p.h } : null;
          });
        } else {
          this.viewport.boundingBox = boundingBox;
        }
        this.on('poststep',this.viewport,'follow');
        this.viewport.follow(true);
      },

      unfollow: function() {
        this.off('poststep',this.viewport,'follow');
      },

      centerOn: function(x,y) {
        this.viewport.centerOn(x,y);
      },

      moveTo: function(x,y) {
        return this.viewport.moveTo(x,y);
      }
    },

    follow: function(first) {
      var followX = Q._isFunction(this.directions.x) ? this.directions.x(this.following) : this.directions.x;
      var followY = Q._isFunction(this.directions.y) ? this.directions.y(this.following) : this.directions.y;

      this[first === true ? 'centerOn' : 'softCenterOn'](
                    followX ?
                      this.following.p.x - this.offsetX :
                      undefined,
                    followY ?
                     this.following.p.y - this.offsetY :
                     undefined
                  );
    },

    offset: function(x,y) {
      this.offsetX = x;
      this.offsetY = y;
    },

    softCenterOn: function(x,y) {
      if(x !== void 0) {
        var dx = (x - Q.width / 2 / this.scale - this.x)/3;
        if(this.boundingBox) {
          if(this.x + dx < this.boundingBox.minX) {
            this.x = this.boundingBox.minX / this.scale;
          }
          else if(this.x + dx > (this.boundingBox.maxX - Q.width) / this.scale) {
            this.x = Math.max(this.boundingBox.maxX - Q.width, this.boundingBox.minX) / this.scale;
          }
          else {
            this.x += dx;
          }
        }
        else {
          this.x += dx;
        }
      }
      if(y !== void 0) {
        var dy = (y - Q.height / 2 / this.scale - this.y)/3;
        if(this.boundingBox) {
          if(this.y + dy < this.boundingBox.minY) {
            this.y = this.boundingBox.minY / this.scale;
          }
          else if(this.y + dy > (this.boundingBox.maxY - Q.height) / this.scale) {
            this.y = Math.max(this.boundingBox.maxY - Q.height, this.boundingBox.minY) / this.scale;
          }
          else {
            this.y += dy;
          }
        }
        else {
          this.y += dy;
        }
      }

    },
    centerOn: function(x,y) {
      if(x !== void 0) {
        this.x = x - Q.width / 2 / this.scale;
      }
      if(y !== void 0) {
        this.y = y - Q.height / 2 / this.scale;
      }

    },

    moveTo: function(x,y) {
      if(x !== void 0) {
        this.x = x;
      }
      if(y !== void 0) {
        this.y = y;
      }
      return this.entity;

    },

    prerender: function() {
      this.centerX = this.x + Q.width / 2 /this.scale;
      this.centerY = this.y + Q.height / 2 /this.scale;
      Q.ctx.save();
      Q.ctx.translate(Math.floor(Q.width/2),Math.floor(Q.height/2));
      Q.ctx.scale(this.scale,this.scale);
      Q.ctx.translate(-Math.floor(this.centerX), -Math.floor(this.centerY));
    },

    postrender: function() {
      Q.ctx.restore();
    }
  });


 Q.Sprite.extend("TileLayer",{

    init: function(props) {
      this._super(props,{
        tileW: 32,
        tileH: 32,
        blockTileW: 10,
        blockTileH: 10,
        type: 1,
        renderAlways: true
      });
      if(this.p.dataAsset) {
        this.load(this.p.dataAsset);
      }

      this.setDimensions();

      this.blocks = [];
      this.p.blockW = this.p.tileW * this.p.blockTileW;
      this.p.blockH = this.p.tileH * this.p.blockTileH;
      this.colBounds = {};
      this.directions = [ 'top','left','right','bottom'];
      this.tileProperties = {};

      this.collisionObject = {
        p: {
          w: this.p.tileW,
          h: this.p.tileH,
          cx: this.p.tileW/2,
          cy: this.p.tileH/2
        }
      };

      this.tileCollisionObjects = {};

      this.collisionNormal = { separate: []};

      this._generateCollisionObjects();
    },

    // Generate the tileCollisionObject overrides where needed
    _generateCollisionObjects: function() {
      var self = this;

      function returnPoint(pt) {
        return [ pt[0] * self.p.tileW - self.p.tileW/2,
                 pt[1] * self.p.tileH - self.p.tileH/2
               ];
      }

      if(this.sheet() && this.sheet().frameProperties) {
        var frameProperties = this.sheet().frameProperties;
        for(var k in frameProperties) {
          var colObj = this.tileCollisionObjects[k] = { p: Q._clone(this.collisionObject.p) };
          Q._extend(colObj.p,frameProperties[k]);

          if(colObj.p.points) {
            colObj.p.points = Q._map(colObj.p.points, returnPoint);
          }

          this.tileCollisionObjects[k] = colObj;
        }
      }

    },

    load: function(dataAsset) {
      var fileParts = dataAsset.split("."),
          fileExt = fileParts[fileParts.length-1].toLowerCase(),
          data;

      if (fileExt === "json") {
        data = Q._isString(dataAsset) ?  Q.asset(dataAsset) : dataAsset;
      }
      else {
        throw "file type not supported";
      }
      this.p.tiles = data;
    },

    setDimensions: function() {
      var tiles = this.p.tiles;

      if(tiles) {
        this.p.rows = tiles.length;
        this.p.cols = tiles[0].length;
        this.p.w = this.p.cols * this.p.tileW;
        this.p.h = this.p.rows * this.p.tileH;
      }
    },

    getTile: function(tileX,tileY) {
      return this.p.tiles[tileY] && this.p.tiles[tileY][tileX];
    },

    getTileProperty: function(tile, prop) {
      if(this.tileProperties[tile] !== undefined) {
        return this.tileProperties[tile][prop];
      } else {
        return;
      }
    },

    getTileProperties: function(tile) {
      if(this.tileProperties[tile] !== undefined) {
        return this.tileProperties[tile];
      } else {
        return {};
      }
    },

    getTilePropertyAt: function(tileX, tileY, prop) {
      return this.getTileProperty(this.getTile(tileX, tileY), prop);
    },

    getTilePropertiesAt: function(tileX, tileY) {
      return this.getTileProperties(this.getTile(tileX, tileY));
    },

    tileHasProperty: function(tile, prop) {
      return(this.getTileProperty(tile, prop) !== undefined);
    },

    setTile: function(x,y,tile) {
      var p = this.p,
          blockX = Math.floor(x/p.blockTileW),
          blockY = Math.floor(y/p.blockTileH);

      if(x >= 0 && x < this.p.cols &&
         y >= 0 && y < this.p.rows) {

        this.p.tiles[y][x] = tile;

        if(this.blocks[blockY]) {
          this.blocks[blockY][blockX] = null;
        }
      }
    },

    tilePresent: function(tileX,tileY) {
      return this.p.tiles[tileY] && this.collidableTile(this.p.tiles[tileY][tileX]);
    },

    // Overload this method to draw tiles at frame 0 or not draw
    // tiles at higher number frames
    drawableTile: function(tileNum) {
      return tileNum > 0;
    },

    // Overload this method to control which tiles trigger a collision
    // (defaults to all tiles > number 0)
    collidableTile: function(tileNum) {
      return tileNum > 0;
    },

    getCollisionObject: function(tileX, tileY) {
      var p = this.p,
          tile = this.getTile(tileX, tileY),
          colObj;

      colObj = (this.tileCollisionObjects[tile] !== undefined) ?
        this.tileCollisionObjects[tile] : this.collisionObject;

      colObj.p.x = tileX * p.tileW + p.x + p.tileW/2;
      colObj.p.y = tileY * p.tileH + p.y + p.tileH/2;

      return colObj;
    },

    collide: function(obj) {
      var p = this.p,
          objP = obj.c || obj.p,
          tileStartX = Math.floor((objP.x - objP.cx - p.x) / p.tileW),
          tileStartY = Math.floor((objP.y - objP.cy - p.y) / p.tileH),
          tileEndX =  Math.ceil((objP.x - objP.cx + objP.w - p.x) / p.tileW),
          tileEndY =  Math.ceil((objP.y - objP.cy + objP.h - p.y) / p.tileH),
          normal = this.collisionNormal,
          col, colObj;

      normal.collided = false;

      for(var tileY = tileStartY; tileY<=tileEndY; tileY++) {
        for(var tileX = tileStartX; tileX<=tileEndX; tileX++) {
          if(this.tilePresent(tileX,tileY)) {
            colObj = this.getCollisionObject(tileX, tileY);

            col = Q.collision(obj,colObj);

            if(col && col.magnitude > 0) {
              if(colObj.p.sensor) {
                colObj.tile = this.getTile(tileX,tileY);
                if(obj.trigger) {
                  obj.trigger('sensor.tile',colObj);
                }
              } else if(!normal.collided || normal.magnitude < col.magnitude ) {
                 normal.collided = true;
                 normal.separate[0] = col.separate[0];
                 normal.separate[1] = col.separate[1];
                 normal.magnitude = col.magnitude;
                 normal.distance = col.distance;
                 normal.normalX = col.normalX;
                 normal.normalY = col.normalY;
                 normal.tileX = tileX;
                 normal.tileY = tileY;
                 normal.tile = this.getTile(tileX,tileY);
                 if(obj.p.collisions !== undefined) {
                   obj.p.collisions.push(normal);
                 }
              }
            }
          }
        }
      }

      return normal.collided ? normal : false;
    },

    prerenderBlock: function(blockX,blockY) {
      var p = this.p,
          tiles = p.tiles,
          sheet = this.sheet(),
          blockOffsetX = blockX*p.blockTileW,
          blockOffsetY = blockY*p.blockTileH;

      if(blockOffsetX < 0 || blockOffsetX >= this.p.cols ||
         blockOffsetY < 0 || blockOffsetY >= this.p.rows) {
           return;
      }

      var canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d');

      canvas.width = p.blockW;
      canvas.height= p.blockH;
      this.blocks[blockY] = this.blocks[blockY] || {};
      this.blocks[blockY][blockX] = canvas;

      for(var y=0;y<p.blockTileH;y++) {
        if(tiles[y+blockOffsetY]) {
          for(var x=0;x<p.blockTileW;x++) {
            if(this.drawableTile(tiles[y+blockOffsetY][x+blockOffsetX])) {
              sheet.draw(ctx,
                         x*p.tileW,
                         y*p.tileH,
                         tiles[y+blockOffsetY][x+blockOffsetX]);
            }
          }
        }
      }
    },

    drawBlock: function(ctx, blockX, blockY) {
      var p = this.p,
          startX = Math.floor(blockX * p.blockW + p.x),
          startY = Math.floor(blockY * p.blockH + p.y);

      if(!this.blocks[blockY] || !this.blocks[blockY][blockX]) {
        this.prerenderBlock(blockX,blockY);
      }

      if(this.blocks[blockY]  && this.blocks[blockY][blockX]) {
        ctx.drawImage(this.blocks[blockY][blockX],startX,startY);
      }
    },

    draw: function(ctx) {
      var p = this.p,
          viewport = this.stage.viewport,
          scale = viewport ? viewport.scale : 1,
          x = viewport ? viewport.x : 0,
          y = viewport ? viewport.y : 0,
          viewW = Q.width / scale,
          viewH = Q.height / scale,
          startBlockX = Math.floor((x - p.x) / p.blockW),
          startBlockY = Math.floor((y - p.y) / p.blockH),
          endBlockX = Math.floor((x + viewW - p.x) / p.blockW),
          endBlockY = Math.floor((y + viewH - p.y) / p.blockH);

      for(var iy=startBlockY;iy<=endBlockY;iy++) {
        for(var ix=startBlockX;ix<=endBlockX;ix++) {
          this.drawBlock(ctx,ix,iy);
        }
      }
    }
  });

  Q.gravityY = 9.8*100;
  Q.gravityX = 0;

  Q.component('2d',{
    added: function() {
      var entity = this.entity;
      Q._defaults(entity.p,{
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        gravity: 1,
        collisionMask: Q.SPRITE_DEFAULT
      });
      entity.on('step',this,"step");
      entity.on('hit',this,'collision');
    },

    collision: function(col,last) {
      var entity = this.entity,
          p = entity.p,
          magnitude = 0;

      if(col.obj.p && col.obj.p.sensor) {
        col.obj.trigger("sensor",entity);
        return;
      }

      col.impact = 0;
      var impactX = Math.abs(p.vx);
      var impactY = Math.abs(p.vy);

      p.x -= col.separate[0];
      p.y -= col.separate[1];

      // Top collision
      if(col.normalY < -0.3) {
        if(!p.skipCollide && p.vy > 0) { p.vy = 0; }
        col.impact = impactY;
        entity.trigger("bump.bottom",col);
      }
      if(col.normalY > 0.3) {
        if(!p.skipCollide && p.vy < 0) { p.vy = 0; }
        col.impact = impactY;

        entity.trigger("bump.top",col);
      }

      if(col.normalX < -0.3) {
        if(!p.skipCollide && p.vx > 0) { p.vx = 0;  }
        col.impact = impactX;
        entity.trigger("bump.right",col);
      }
      if(col.normalX > 0.3) {
        if(!p.skipCollide && p.vx < 0) { p.vx = 0; }
        col.impact = impactX;

        entity.trigger("bump.left",col);
      }
    },

    step: function(dt) {
      var p = this.entity.p,
          dtStep = dt;
      // TODO: check the entity's magnitude of vx and vy,
      // reduce the max dtStep if necessary to prevent
      // skipping through objects.
      while(dtStep > 0) {
        dt = Math.min(1/30,dtStep);
        // Updated based on the velocity and acceleration
        p.vx += p.ax * dt + (p.gravityX === void 0 ? Q.gravityX : p.gravityX) * dt * p.gravity;
        p.vy += p.ay * dt + (p.gravityY === void 0 ? Q.gravityY : p.gravityY) * dt * p.gravity;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        this.entity.stage.collide(this.entity);
        dtStep -= dt;
      }
    }
  });

  Q.component('aiBounce', {
    added: function() {
      this.entity.on("bump.right",this,"goLeft");
      this.entity.on("bump.left",this,"goRight");
    },

    goLeft: function(col) {
      this.entity.p.vx = -col.impact;
      if(this.entity.p.defaultDirection === 'right') {
          this.entity.p.flip = 'x';
      }
      else {
          this.entity.p.flip = false;
      }
    },

    goRight: function(col) {
      this.entity.p.vx = col.impact;
      if(this.entity.p.defaultDirection === 'left') {
          this.entity.p.flip = 'x';
      }
      else {
          this.entity.p.flip = false;
      }
    }
  });

};


};


if(typeof Quintus === 'undefined') {
  module.exports = quintus2D;
} else {
  quintus2D(Quintus);
}


/*global Quintus:false, module:false */

/**
Quintus HTML5 Game Engine - Input Module

The code in `quintus_input.js` defines the `Quintus.Input` module, which
concerns itself with game-type (pretty anything besides touchscreen input)

@module Quintus.Input
*/


var quintusInput = function(Quintus) { 
"use strict";

/**
 * Quintus Input Module
 *
 * @class Quintus.Input
 */
Quintus.Input = function(Q) {
  /**
   * Provided key names mapped to key codes - add more names and key codes as necessary
   *
   * @for Quintus.Input
   * @property KEY_NAMES
   * @type Object
   * @static
   */
  var KEY_NAMES = Q.KEY_NAMES = {
    LEFT: 37, RIGHT: 39,
    UP: 38, DOWN: 40,

    ZERO : 48, ONE : 49, TWO : 50,
    THREE : 51, FOUR : 52, FIVE : 53,
    SIX : 54, SEVEN : 55, EIGHT : 56,
    NINE : 57,

    A : 65, B : 66, C : 67,
    D : 68, E : 69, F : 70,
    G : 71, H : 72, I : 73,
    J : 74, K : 75, L : 76,
    M : 77, N : 78, O : 79,
    P : 80, Q : 81, R : 82,
    S : 83, T : 84, U : 85,
    V : 86, W : 87, X : 88,
    Y : 89, Z : 90,

    ENTER: 13,
    ESC: 27,
    BACKSPACE : 8,
    TAB : 9,
    SHIFT : 16,
    CTRL : 17,
    ALT : 18,
    SPACE: 32,

    HOME : 36, END : 35,
    PGGUP : 33, PGDOWN : 34
  };

  var DEFAULT_KEYS = {
    LEFT: 'left', RIGHT: 'right',
    UP: 'up',     DOWN: 'down',
    SPACE: 'fire',
    Z: 'fire',
    X: 'action',
    ENTER: 'confirm',
    ESC: 'esc',
    P: 'P',
    S: 'S'
  };

  var DEFAULT_TOUCH_CONTROLS  = [ ['left','<' ],
                            ['right','>' ],
                            [],
                            ['action','b'],
                            ['fire', 'a' ]];

  // Clockwise from midnight (a la CSS)
  var DEFAULT_JOYPAD_INPUTS =  [ 'up','right','down','left'];

  /**
   * Current state of bound inputs
   *
   * @for Quintus.Input
   * @property Q.inputs
   * @type Object
   */
  Q.inputs = {};
  Q.joypad = {};

  var hasTouch =  !!('ontouchstart' in window);


  /**
   *
   * Convert a canvas point to a stage point, x dimension
   *
   * @method Q.canvasToStageX
   * @for Quintus.Input
   * @param {Float} x
   * @param {Q.Stage} stage
   * @returns {Integer} x
   */
  Q.canvasToStageX = function(x,stage) {
    x = x / Q.cssWidth * Q.width;
    if(stage.viewport) {
      x /= stage.viewport.scale;
      x += stage.viewport.x;
    }

    return x;
  };

  /**
   *
   * Convert a canvas point to a stage point, y dimension
   *
   * @method Q.canvasToStageY
   * @param {Float} y
   * @param {Q.Stage} stage
   * @returns {Integer} y
   */
  Q.canvasToStageY = function(y,stage) {
      y = y / Q.cssWidth * Q.width;
      if(stage.viewport) {
        y /= stage.viewport.scale;
        y += stage.viewport.y;
      }

      return y;
  };



  /**
   *
   * Button and mouse input subsystem for Quintus.
   * An instance of this class is auto-created as {{#crossLink "Q.input"}}{{/crossLink}}
   *
   * @class Q.InputSystem
   * @extends Q.Evented
   * @for Quintus.Input
   */
  Q.InputSystem = Q.Evented.extend({
    keys: {},
    keypad: {},
    keyboardEnabled: false,
    touchEnabled: false,
    joypadEnabled: false,

    /**
     * Bind a key name or keycode to an action name (used by `keyboardControls`)
     *
     * @method bindKey
     * @for Q.InputSystem
     * @param {String or Integer} key - name or integer keycode for to bind
     * @param {String} name - name of action to bind to
     */
    bindKey: function(key,name) {
      Q.input.keys[KEY_NAMES[key] || key] = name;
    },

    /**
     * Enable keyboard controls by binding to events
     *
     * @for Q.InputSystem
     * @method enableKeyboard
     */
    enableKeyboard: function() {
      if(this.keyboardEnabled) { return false; }

      // Make selectable and remove an :focus outline
      Q.el.tabIndex = 0;
      Q.el.style.outline = 0;

      Q.el.addEventListener("keydown",function(e) {
        if(Q.input.keys[e.keyCode]) {
          var actionName = Q.input.keys[e.keyCode];
          Q.inputs[actionName] = true;
          Q.input.trigger(actionName);
          Q.input.trigger('keydown',e.keyCode);
        }
        if(!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      },false);

      Q.el.addEventListener("keyup",function(e) {
        if(Q.input.keys[e.keyCode]) {
          var actionName = Q.input.keys[e.keyCode];
          Q.inputs[actionName] = false;
          Q.input.trigger(actionName + "Up");
          Q.input.trigger('keyup',e.keyCode);
        }
        e.preventDefault();
      },false);

      if(Q.options.autoFocus) {  Q.el.focus(); }
      this.keyboardEnabled = true;
    },


    /**
     * Convenience method to activate keyboard controls (call `bindKey` and `enableKeyboard` internally)
      *
     * @method keyboardControls
     * @for Q.InputSystem
     * @param {Object} [keys] - hash of key names or codes to actions
     */
    keyboardControls: function(keys) {
      keys = keys || DEFAULT_KEYS;
      Q._each(keys,function(name,key) {
       this.bindKey(key,name);
      },Q.input);
      this.enableKeyboard();
    },

    _containerOffset: function() {
      Q.input.offsetX = 0;
      Q.input.offsetY = 0;
      var el = Q.el;
      do {
        Q.input.offsetX += el.offsetLeft;
        Q.input.offsetY += el.offsetTop;
      } while(el = el.offsetParent);
    },

    touchLocation: function(touch) {
      var el = Q.el,
        posX = touch.offsetX,
        posY = touch.offsetY,
        touchX, touchY;

      if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
        posX = touch.layerX;
        posY = touch.layerY;
      }

      if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
        if(Q.input.offsetX === void 0) { Q.input._containerOffset(); }
        posX = touch.pageX - Q.input.offsetX;
        posY = touch.pageY - Q.input.offsetY;
      }

      touchX = Q.width * posX / Q.cssWidth;
      touchY = Q.height * posY / Q.cssHeight;


      return { x: touchX, y: touchY };
    },

    /**
     * Activate touch button controls - pass in an options hash to override
     *
     * Default Options:
     *
     *     {
     *        left: 0,
     *        gutter:10,
     *        controls: DEFAULT_TOUCH_CONTROLS,
     *        width: Q.width,
     *        bottom: Q.height
     *      }
     *
     * Default controls are left and right buttons, a space, and 'a' and 'b' buttons, as defined as an Array of Arrays below:
     *
     *      [ ['left','<' ],
     *        ['right','>' ],
     *        [],  // use an empty array as a spacer
     *        ['action','b'],
     *        ['fire', 'a' ]]
     *
     * @method touchControls
     * @for Q.InputSystem
     * @param {Object} [opts] - Options hash
     */
    touchControls: function(opts) {
      if(this.touchEnabled) { return false; }
      if(!hasTouch) { return false; }

      Q.input.keypad = opts = Q._extend({
        left: 0,
        gutter:10,
        controls: DEFAULT_TOUCH_CONTROLS,
        width: Q.width,
        bottom: Q.height,
        fullHeight: false
      },opts);

      opts.unit = (opts.width / opts.controls.length);
      opts.size = opts.unit - (opts.gutter * 2);

      function getKey(touch) {
        var pos = Q.input.touchLocation(touch),
            minY = opts.bottom - opts.unit;
        for(var i=0,len=opts.controls.length;i<len;i++) {
          var minX = i * opts.unit + opts.gutter;
          if(pos.x >= minX && pos.x <= (minX+opts.size) && (opts.fullHeight || (pos.y >= minY + opts.gutter && pos.y <= (minY+opts.unit - opts.gutter))))
          {
            return opts.controls[i][0];
          }
        }
      }

      function touchDispatch(event) {
        var wasOn = {},
            i, len, tch, key, actionName;

        // Reset all the actions bound to controls
        // but keep track of all the actions that were on
        for(i=0,len = opts.controls.length;i<len;i++) {
          actionName = opts.controls[i][0];
          if(Q.inputs[actionName]) { wasOn[actionName] = true; }
          Q.inputs[actionName] = false;
        }

        var touches = event.touches ? event.touches : [ event ];

        for(i=0,len=touches.length;i<len;i++) {
          tch = touches[i];
          key = getKey(tch);

          if(key) {
            // Mark this input as on
            Q.inputs[key] = true;

            // Either trigger a new action
            // or remove from wasOn list
            if(!wasOn[key]) {
              Q.input.trigger(key);
            } else {
              delete wasOn[key];
            }
          }
        }

        // Any remaining were on the last frame
        // and need to trigger an up action
        for(actionName in wasOn) {
          Q.input.trigger(actionName + "Up");
        }

        return null;
      }

      this.touchDispatchHandler = function(e) {
        touchDispatch(e);
        e.preventDefault();
      };


      Q._each(["touchstart","touchend","touchmove","touchcancel"],function(evt) {
        Q.el.addEventListener(evt,this.touchDispatchHandler);
      },this);

      this.touchEnabled = true;
    },

    /**
     * Turn off touch (button and joypad) controls and remove event listeners
     *
     * @method disableTouchControls
     * @for Q.InputSystem
     */
    disableTouchControls: function() {
      Q._each(["touchstart","touchend","touchmove","touchcancel"],function(evt) {
        Q.el.removeEventListener(evt,this.touchDispatchHandler);
      },this);

      Q.el.removeEventListener('touchstart',this.joypadStart);
      Q.el.removeEventListener('touchmove',this.joypadMove);
      Q.el.removeEventListener('touchend',this.joypadEnd);
      Q.el.removeEventListener('touchcancel',this.joypadEnd);
      this.touchEnabled = false;

      // clear existing inputs
      for(var input in Q.inputs) {
        Q.inputs[input] = false;
      }
    },

    /**
     * Activate joypad controls (i.e. 4-way touch controls)
     *
     * Lots of options, defaults are:
     *
     *     {
     *      size: 50,
     *      trigger: 20,
     *      center: 25,
     *      color: "#CCC",
     *      background: "#000",
     *      alpha: 0.5,
     *      zone: Q.width / 2,
     *      inputs: DEFAULT_JOYPAD_INPUTS
     *    }
     *
     *  Default joypad controls is an array that defines the inputs to bind to:
     *
     *       // Clockwise from midnight (a la CSS)
     *       var DEFAULT_JOYPAD_INPUTS =  [ 'up','right','down','left'];
     *
     * @method joypadControls
     * @for Q.InputSystem
     * @param {Object} [opts] -  joypad options
     */
   joypadControls: function(opts) {
      if(this.joypadEnabled) { return false; }
      if(!hasTouch) { return false; }

      var joypad = Q.joypad = Q._defaults(opts || {},{
        size: 50,
        trigger: 20,
        center: 25,
        color: "#CCC",
        background: "#000",
        alpha: 0.5,
        zone: Q.width / 2,
        joypadTouch: null,
        inputs: DEFAULT_JOYPAD_INPUTS,
        triggers: []
      });

      this.joypadStart = function(evt) {
        if(joypad.joypadTouch === null) {
          var touch = evt.changedTouches[0],
              loc = Q.input.touchLocation(touch);

          if(loc.x < joypad.zone) {
            joypad.joypadTouch = touch.identifier;
            joypad.centerX = loc.x;
            joypad.centerY = loc.y;
            joypad.x = null;
            joypad.y = null;
          }
        }
      };


      this.joypadMove = function(e) {
        if(joypad.joypadTouch !== null) {
          var evt = e;

          for(var i=0,len=evt.changedTouches.length;i<len;i++) {
            var touch = evt.changedTouches[i];

            if(touch.identifier === joypad.joypadTouch) {
              var loc = Q.input.touchLocation(touch),
                  dx = loc.x - joypad.centerX,
                  dy = loc.y - joypad.centerY,
                  dist = Math.sqrt(dx * dx + dy * dy),
                  overage = Math.max(1,dist / joypad.size),
                  ang =  Math.atan2(dx,dy);

              if(overage > 1) {
                dx /= overage;
                dy /= overage;
                dist /= overage;
              }

              var triggers = [
                dy < -joypad.trigger,
                dx > joypad.trigger,
                dy > joypad.trigger,
                dx < -joypad.trigger
              ];

              for(var k=0;k<triggers.length;k++) {
                var actionName = joypad.inputs[k];
                if(triggers[k]) {
                  Q.inputs[actionName] = true;

                  if(!joypad.triggers[k]) {
                    Q.input.trigger(actionName);
                  }
                } else {
                  Q.inputs[actionName] = false;
                  if(joypad.triggers[k]) {
                    Q.input.trigger(actionName + "Up");
                  }
                }
              }

              Q._extend(joypad, {
                dx: dx, dy: dy,
                x: joypad.centerX + dx,
                y: joypad.centerY + dy,
                dist: dist,
                ang: ang,
                triggers: triggers
              });

              break;
            }
          }
        }
        e.preventDefault();
      };

      this.joypadEnd = function(e) {
          var evt = e;

          if(joypad.joypadTouch !== null) {
            for(var i=0,len=evt.changedTouches.length;i<len;i++) {
            var touch = evt.changedTouches[i];
              if(touch.identifier === joypad.joypadTouch) {
                for(var k=0;k<joypad.triggers.length;k++) {
                  var actionName = joypad.inputs[k];
                  Q.inputs[actionName] = false;
                    if(joypad.triggers[k]) {
                        Q.input.trigger(actionName + "Up");
                    }
                }
                joypad.joypadTouch = null;
                break;
              }
            }
          }
          e.preventDefault();
      };

      Q.el.addEventListener("touchstart",this.joypadStart);
      Q.el.addEventListener("touchmove",this.joypadMove);
      Q.el.addEventListener("touchend",this.joypadEnd);
      Q.el.addEventListener("touchcancel",this.joypadEnd);

      this.joypadEnabled = true;
    },

    /**
     * Activate mouse controls - mouse controls don't trigger events, but just set `Q.inputs['mouseX']` & `Q.inputs['mouseY']` on each frame.
     *
     * Default options:
     *
     *     {
     *       stageNum: 0,
     *       mouseX: "mouseX",
     *       mouseY: "mouseY",
     *       cursor: "off"
     *     }
     *
     * @method mouseControls
     * @for Q.InputSystem
     * @param {Object} [options] - override default options
     */
    mouseControls: function(options) {
      options = options || {};

      var stageNum = options.stageNum || 0;
      var mouseInputX = options.mouseX || "mouseX";
      var mouseInputY = options.mouseY || "mouseY";
      var cursor = options.cursor || "off";

      var mouseMoveObj = {};

      if(cursor !== "on") {
          if(cursor === "off") {
              Q.el.style.cursor = 'none';
          }
          else {
              Q.el.style.cursor = cursor;
          }
      }

      Q.inputs[mouseInputX] = 0;
      Q.inputs[mouseInputY] = 0;

      Q._mouseMove = function(e) {
        e.preventDefault();
        var touch = e.touches ? e.touches[0] : e;
        var el = Q.el,
          rect = el.getBoundingClientRect(),
          style = window.getComputedStyle(el),
          posX = touch.clientX - rect.left - parseInt(style.paddingLeft, 10),
          posY = touch.clientY - rect.top  - parseInt(style.paddingTop, 10);

        var stage = Q.stage(stageNum);

        if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
          posX = touch.offsetX;
          posY = touch.offsetY;
        }

        if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
          posX = touch.layerX;
          posY = touch.layerY;
        }

        if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
          if(Q.input.offsetX === void 0) { Q.input._containerOffset(); }
          posX = touch.pageX - Q.input.offsetX;
          posY = touch.pageY - Q.input.offsetY;
        }

        if(stage) {
          mouseMoveObj.x= Q.canvasToStageX(posX,stage);
          mouseMoveObj.y= Q.canvasToStageY(posY,stage);

          Q.inputs[mouseInputX] = mouseMoveObj.x;
          Q.inputs[mouseInputY] = mouseMoveObj.y;

          Q.input.trigger('mouseMove',mouseMoveObj);
        }
      };

      Q.el.addEventListener('mousemove',Q._mouseMove,true);
      Q.el.addEventListener('touchstart',Q._mouseMove,true);
      Q.el.addEventListener('touchmove',Q._mouseMove,true);
    },

    /**
     * Turn off mouse controls
     *
     * @method disableMouseControls
     * @for Q.InputSystem
     */
    disableMouseControls: function() {
      if(Q._mouseMove) {
        Q.el.removeEventListener("mousemove",Q._mouseMove, true);
        Q.el.style.cursor = 'inherit';
        Q._mouseMove = null;
      }
    },

    /**
     * Draw the touch buttons on the screen
     *
     * overload this to change how buttons are drawn
     *
     * @method drawButtons
     * @for Q.InputSystem
     */
    drawButtons: function() {
      var keypad = Q.input.keypad,
          ctx = Q.ctx;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for(var i=0;i<keypad.controls.length;i++) {
        var control = keypad.controls[i];

        if(control[0]) {
          ctx.font = "bold " + (keypad.size/2) + "px arial";
          var x = keypad.left + i * keypad.unit + keypad.gutter,
              y = keypad.bottom - keypad.unit,
              key = Q.inputs[control[0]];

          ctx.fillStyle = keypad.color || "#FFFFFF";
          ctx.globalAlpha = key ? 1.0 : 0.5;
          ctx.fillRect(x,y,keypad.size,keypad.size);

          ctx.fillStyle = keypad.text || "#000000";
          ctx.fillText(control[1],
                       x+keypad.size/2,
                       y+keypad.size/2);
        }
      }

      ctx.restore();
    },

    drawCircle: function(x,y,color,size) {
      var ctx = Q.ctx,
          joypad = Q.joypad;

      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha=joypad.alpha;
      ctx.fillStyle = color;
      ctx.arc(x, y, size, 0, Math.PI*2, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },



    /**
     * Draw the joypad on the screen
     *
     * overload this to change how joypad is drawn
     *
     * @method drawJoypad
     * @for Q.InputSystem
     */
    drawJoypad: function() {
      var joypad = Q.joypad;
      if(joypad.joypadTouch !== null) {
        Q.input.drawCircle(joypad.centerX,
                           joypad.centerY,
                           joypad.background,
                           joypad.size);

        if(joypad.x !== null) {
          Q.input.drawCircle(joypad.x,
                           joypad.y,
                           joypad.color,
                           joypad.center);
        }
      }

    },

    /**
     * Called each frame by the stage game loop to render any onscreen UI
     *
     * calls `drawJoypad` and `drawButtons` if enabled
     *
     * @method drawCanvas
     * @for Q.InputSystem
     */
    drawCanvas: function() {
      if(this.touchEnabled) {
        this.drawButtons();
      }

      if(this.joypadEnabled) {
        this.drawJoypad();
      }
    }


  });

  /**
   * Instance of the input subsytem that is actually used during gameplay
   *
   * @property Q.input
   * @for Quintus.Input
   * @type Q.InputSystem
   */
  Q.input = new Q.InputSystem();

  /**
   * Helper method to activate controls with default options
   *
   * @for Quintus.Input
   * @method Q.controls
   * @param {Boolean} joypad - enable 4-way joypad (true) or just left, right controls (false, undefined)
   */
  Q.controls = function(joypad) {
    Q.input.keyboardControls();

    if(joypad) {
      Q.input.touchControls({
        controls: [ [],[],[],['action','b'],['fire','a']]
      });
      Q.input.joypadControls();
    } else {
      Q.input.touchControls();
    }

    return Q;
  };


  /**
   * Platformer Control Component
   *
   * Adds 2D platformer controls onto a Sprite
   *
   * Platformer controls bind to left, and right and allow the player to jump.
   *
   * Adds the following properties to the entity to control speed and jumping:
   *
   *      {
   *        speed: 200,
   *        jumpSpeed: -300
   *      }
   *
   *
   * @class platformerControls
   * @for Quintus.Input
   */
  Q.component("platformerControls", {
    defaults: {
      speed: 200,
      jumpSpeed: -300,
      collisions: []
    },

    added: function() {
      var p = this.entity.p;

      Q._defaults(p,this.defaults);

      this.entity.on("step",this,"step");
      this.entity.on("bump.bottom",this,"landed");

      p.landed = 0;
      p.direction ='right';
    },

    landed: function(col) {
      var p = this.entity.p;
      p.landed = 1/5;
    },

    step: function(dt) {
      var p = this.entity.p;

      if(p.ignoreControls === undefined || !p.ignoreControls) {
        var collision = null;

        // Follow along the current slope, if possible.
        if(p.collisions !== undefined && p.collisions.length > 0 && (Q.inputs['left'] || Q.inputs['right'] || p.landed > 0)) {
          if(p.collisions.length === 1) {
            collision = p.collisions[0];
          } else {
            // If there's more than one possible slope, follow slope with negative Y normal
            collision = null;

            for(var i = 0; i < p.collisions.length; i++) {
              if(p.collisions[i].normalY < 0) {
                collision = p.collisions[i];
              }
            }
          }

          // Don't climb up walls.
          if(collision !== null && collision.normalY > -0.3 && collision.normalY < 0.3) {
            collision = null;
          }
        }

        if(Q.inputs['left']) {
          p.direction = 'left';
          if(collision && p.landed > 0) {
            p.vx = p.speed * collision.normalY;
            p.vy = -p.speed * collision.normalX;
          } else {
            p.vx = -p.speed;
          }
        } else if(Q.inputs['right']) {
          p.direction = 'right';
          if(collision && p.landed > 0) {
            p.vx = -p.speed * collision.normalY;
            p.vy = p.speed * collision.normalX;
          } else {
            p.vx = p.speed;
          }
        } else {
          p.vx = 0;
          if(collision && p.landed > 0) {
            p.vy = 0;
          }
        }

        if(p.landed > 0 && (Q.inputs['up'] || Q.inputs['action']) && !p.jumping) {
          p.vy = p.jumpSpeed;
          p.landed = -dt;
          p.jumping = true;
        } else if(Q.inputs['up'] || Q.inputs['action']) {
          this.entity.trigger('jump', this.entity);
          p.jumping = true;
        }

        if(p.jumping && !(Q.inputs['up'] || Q.inputs['action'])) {
          p.jumping = false;
          this.entity.trigger('jumped', this.entity);
          if(p.vy < p.jumpSpeed / 3) {
            p.vy = p.jumpSpeed / 3;
          }
        }
      }
      p.landed -= dt;
    }
  });


  /**
   * Step Controls component
   *
   * Adds Step (square grid based) 4-ways controls onto a Sprite
   *
   * Adds the following properties to the entity:
   *
   *      {
   *        stepDistance: 32, // should be tile size
   *        stepDelay: 0.2  // seconds to delay before next step
   *      }
   *
   *
   * @class stepControls
   * @for Quintus.Input
   */
  Q.component("stepControls", {

    added: function() {
      var p = this.entity.p;

      if(!p.stepDistance) { p.stepDistance = 32; }
      if(!p.stepDelay) { p.stepDelay = 0.2; }

      p.stepWait = 0;
      this.entity.on("step",this,"step");
      this.entity.on("hit", this,"collision");
    },

    collision: function(col) {
      var p = this.entity.p;

      if(p.stepping) {
        p.stepping = false;
        p.x = p.origX;
        p.y = p.origY;
      }

    },

    step: function(dt) {
      var p = this.entity.p,
          moved = false;
      p.stepWait -= dt;

      if(p.stepping) {
        p.x += p.diffX * dt / p.stepDelay;
        p.y += p.diffY * dt / p.stepDelay;
      }

      if(p.stepWait > 0) { return; }
      if(p.stepping) {
        p.x = p.destX;
        p.y = p.destY;
      }
      p.stepping = false;

      p.diffX = 0;
      p.diffY = 0;

      if(Q.inputs['left']) {
        p.diffX = -p.stepDistance;
      } else if(Q.inputs['right']) {
        p.diffX = p.stepDistance;
      }

      if(Q.inputs['up']) {
        p.diffY = -p.stepDistance;
      } else if(Q.inputs['down']) {
        p.diffY = p.stepDistance;
      }

      if(p.diffY || p.diffX ) {
        p.stepping = true;
        p.origX = p.x;
        p.origY = p.y;
        p.destX = p.x + p.diffX;
        p.destY = p.y + p.diffY;
        p.stepWait = p.stepDelay;
      }

    }

  });
};


};

if(typeof Quintus === 'undefined') {
  module.exports = quintusInput;
} else {
  quintusInput(Quintus);
}


/*global Quintus:false, module:false, window: false */

var quintusTouch = function(Quintus) {
"use strict";

Quintus.Touch = function(Q) {
  if(Q._isUndefined(Quintus.Sprites)) {
    throw "Quintus.Touch requires Quintus.Sprites Module";
  }

  var touchStage = [0];
  var touchType = 0;

  Q.Evented.extend("TouchSystem",{

    init: function() {
      var touchSystem = this;

      this.boundTouch = function(e) { touchSystem.touch(e); };
      this.boundDrag = function(e) { touchSystem.drag(e); };
      this.boundEnd = function(e) { touchSystem.touchEnd(e); };

      Q.el.addEventListener('touchstart',this.boundTouch);
      Q.el.addEventListener('mousedown',this.boundTouch);

      Q.el.addEventListener('touchmove',this.boundDrag);
      Q.el.addEventListener('mousemove',this.boundDrag);

      Q.el.addEventListener('touchend',this.boundEnd);
      Q.el.addEventListener('mouseup',this.boundEnd);
      Q.el.addEventListener('touchcancel',this.boundEnd);

      this.touchPos = new Q.Evented();
      this.touchPos.grid = {};
      this.touchPos.p = { w:1, h:1, cx: 0, cy: 0 };
      this.activeTouches = {};
      this.touchedObjects = {};
    },

    destroy: function() {
      Q.el.removeEventListener('touchstart',this.boundTouch);
      Q.el.removeEventListener('mousedown',this.boundTouch);

      Q.el.removeEventListener('touchmove',this.boundDrag);
      Q.el.removeEventListener('mousemove',this.boundDrag);

      Q.el.removeEventListener('touchend',this.boundEnd);
      Q.el.removeEventListener('mouseup',this.boundEnd);
      Q.el.removeEventListener('touchcancel',this.boundEnd);
    },

    normalizeTouch: function(touch,stage) {

      var el = Q.el,
        rect = el.getBoundingClientRect(),
        style = window.getComputedStyle(el),
        posX = touch.clientX - rect.left - parseInt(style.paddingLeft, 10),
        posY = touch.clientY - rect.top  - parseInt(style.paddingTop, 10);

      if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
         posX = touch.offsetX;
         posY = touch.offsetY;
      }

      if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
        posX = touch.layerX;
        posY = touch.layerY;
      }

      if(Q._isUndefined(posX) || Q._isUndefined(posY)) {
        if(Q.touch.offsetX === void 0) {
          Q.touch.offsetX = 0;
          Q.touch.offsetY = 0;
          el = Q.el;
          do {
            Q.touch.offsetX += el.offsetLeft;
            Q.touch.offsetY += el.offsetTop;
          } while(el = el.offsetParent);
        }
        posX = touch.pageX - Q.touch.offsetX;
        posY = touch.pageY - Q.touch.offsetY;
      }

      this.touchPos.p.ox = this.touchPos.p.px = posX / Q.cssWidth * Q.width;
      this.touchPos.p.oy = this.touchPos.p.py = posY / Q.cssHeight * Q.height;

      if(stage.viewport) {
        this.touchPos.p.px /= stage.viewport.scale;
        this.touchPos.p.py /= stage.viewport.scale;
        this.touchPos.p.px += stage.viewport.x;
        this.touchPos.p.py += stage.viewport.y;
      }

      this.touchPos.p.x = this.touchPos.p.px;
      this.touchPos.p.y = this.touchPos.p.py;

      this.touchPos.obj = null;
      return this.touchPos;
    },

    touch: function(e) {
      var touches = e.changedTouches || [ e ];

      for(var i=0;i<touches.length;i++) {

        for(var stageIdx=0;stageIdx < touchStage.length;stageIdx++) {
          var touch = touches[i],
              stage = Q.stage(touchStage[stageIdx]);

          if(!stage) { continue; }

          touch.identifier = touch.identifier || 0;
          var pos = this.normalizeTouch(touch,stage);

          stage.regrid(pos,true);
          var col = stage.search(pos,touchType), obj;

          if(col || stageIdx === touchStage.length - 1) {
            obj = col && col.obj;
            pos.obj = obj;
            this.trigger("touch",pos);
          }

          if(obj && !this.touchedObjects[obj]) {
            this.activeTouches[touch.identifier] = {
              x: pos.p.px,
              y: pos.p.py,
              origX: obj.p.x,
              origY: obj.p.y,
              sx: pos.p.ox,
              sy: pos.p.oy,
              identifier: touch.identifier,
              obj: obj,
              stage: stage
            };
            this.touchedObjects[obj.p.id] = true;
            obj.trigger('touch', this.activeTouches[touch.identifier]);
            break;
          }

        }

      }
      //e.preventDefault();
    },

    drag: function(e) {
      var touches = e.changedTouches || [ e ];

      for(var i=0;i<touches.length;i++) {
        var touch = touches[i];
        touch.identifier = touch.identifier || 0;

        var active = this.activeTouches[touch.identifier],
            stage = active && active.stage;

        if(active) {
          var pos = this.normalizeTouch(touch,stage);
          active.x = pos.p.px;
          active.y = pos.p.py;
          active.dx = pos.p.ox - active.sx;
          active.dy = pos.p.oy - active.sy;

          active.obj.trigger('drag', active);
        }
      }
      e.preventDefault();
    },

    touchEnd: function(e) {
      var touches = e.changedTouches || [ e ];

      for(var i=0;i<touches.length;i++) {
        var touch = touches[i];

        touch.identifier = touch.identifier || 0;

        var active = this.activeTouches[touch.identifier];

        if(active) {
          active.obj.trigger('touchEnd', active);
          delete this.touchedObjects[active.obj.p.id];
          this.activeTouches[touch.identifier] = null;
        }
      }
      e.preventDefault();
    }

  });

  Q.touch = function(type,stage) {
    Q.untouch();
    touchType = type || Q.SPRITE_UI;
    touchStage = stage || [2,1,0];
    if(!Q._isArray(touchStage)) {
      touchStage = [touchStage];
    }

    if(!Q._touch) {
      Q.touchInput = new Q.TouchSystem();
    }
    return Q;
  };

  Q.untouch = function() {
    if(Q.touchInput) {
      Q.touchInput.destroy();
      delete Q['touchInput'];
    }
    return Q;
  };

};


};


if(typeof Quintus === 'undefined') {
  module.exports = quintusTouch;
} else {
  quintusTouch(Quintus);
}


/*global Quintus:false, module:false */

/**
Quintus HTML5 Game Engine - Sprites Module

The code in `quintus_sprites.js` defines the `Quintus.Sprites` module, which
add support for sprite sheets and the base sprite class.

Most games will include at a minimum `Quintus.Sprites` and `Quintus.Scenes`

@module Quintus.Sprites
*/


var quintusSprites = function(Quintus) {
"use strict";


/**
 * Quintus Sprites Module Class
 *
 * @class Quintus.Sprites
 */
Quintus.Sprites = function(Q) {

  /**

  Sprite sheet class - generally instantiated with `Q.sheet` new `new`


  @class Q.SpriteSheet
  @extends Q.Class
  @for Quintus.Sprites
  */
  Q.Class.extend("SpriteSheet",{

    /**
    constructor

    Options:

      * tileW - tile width
      * tileH - tile height
      * w     - width of the sprite block
      * h     - height of the sprite block
      * sx    - start x
      * sy    - start y
      * spacingX - spacing between each tile x (after 1st)
      * spacingY - spacing between each tile y
      * marginX - margin around each tile x
      * marginY - margin around each tile y
      * cols  - number of columns per row

    @constructor
    @for Q.SpriteSheet
    @method init
    @param {String} name
    @param {String} asset
    @param {Object} options
    */
    init: function(name, asset,options) {
      if(!Q.asset(asset)) { throw "Invalid Asset:" + asset; }
      Q._extend(this,{
        name: name,
        asset: asset,
        w: Q.asset(asset).width,
        h: Q.asset(asset).height,
        tileW: 64,
        tileH: 64,
        sx: 0,
        sy: 0,
        spacingX: 0,
        spacingY: 0,
        frameProperties: {}
        });
      if(options) { Q._extend(this,options); }
      // fix for old tilew instead of tileW
      if(this.tilew) {
        this.tileW = this.tilew;
        delete this['tilew'];
      }
      if(this.tileh) {
        this.tileH = this.tileh;
        delete this['tileh'];
      }

      this.cols = this.cols ||
                  Math.floor(this.w / (this.tileW + this.spacingX));

      this.frames = this.cols * (Math.floor(this.h/(this.tileH + this.spacingY)));
    },

    /**
     Returns the starting x position of a single frame

     @method fx
     @for Q.SpriteSheet
     @param {Integer} frame
    */
    fx: function(frame) {
      return Math.floor((frame % this.cols) * (this.tileW + this.spacingX) + this.sx);
    },

    /**
     Returns the starting y position of a single frame

     @method fy
     @for Q.SpriteSheet
     @param {Integer} frame
    */
    fy: function(frame) {
      return Math.floor(Math.floor(frame / this.cols) * (this.tileH + this.spacingY) + this.sy);
    },

    /**
     Draw a single frame at x,y on the provided context

     @method draw
     @for Q.SpriteSheet
     @param {Context2D} ctx
     @param {Float} x
     @param {Float} y
     @param {Integer} frame
    */
    draw: function(ctx, x, y, frame) {
      if(!ctx) { ctx = Q.ctx; }
      ctx.drawImage(Q.asset(this.asset),
                    this.fx(frame),this.fy(frame),
                    this.tileW, this.tileH,
                    Math.floor(x),Math.floor(y),
                    this.tileW, this.tileH);

    }

  });


  Q.sheets = {};

  /**
   Return a `Q.SpriteSheet` or  create a new sprite sheet

   @method Q.sheet
   @for Quintus.Sprites
   @param {String} name - name of sheet to return or create
   @param {String} [asset] - if provided, will create a sprite sheet using this asset
   @param {Object} [options] - if provided, will be passed as options to `Q.SpriteSheet`
  */
  Q.sheet = function(name,asset,options) {
    if(asset) {
      Q.sheets[name] = new Q.SpriteSheet(name,asset,options);
    } else {
      return Q.sheets[name];
    }
  };

  /**
   Create a number of `Q.SpriteSheet` objects from an image asset and a sprite data JSON asset

   @method Q.compileSheets
   @for Quintus.Sprites
   @param {String} imageAsset
   @param {String spriteDataAsset
  */
  Q.compileSheets = function(imageAsset,spriteDataAsset) {
    var data = Q.asset(spriteDataAsset);
    Q._each(data,function(spriteData,name) {
      Q.sheet(name,imageAsset,spriteData);
    });
  };


  /**
   Bitmask 0 to indicate no sprites

   @property Q.SPRITE_NONE
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_NONE     = 0;

  /**
   default sprite type 1

   @property Q.SPRITE_DEFAULT
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_DEFAULT  = 1;

  /**
   particle sprite type 2

   @property Q.SPRITE_PARTICLE
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_PARTICLE = 2;

  /**
   active sprite type 4

   @property Q.SPRITE_ACTIVE
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_ACTIVE   = 4;

  /**
   friendly sprite type 8

   @property Q.SPRITE_FRIENDLY
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_FRIENDLY = 8;

  /**
   enemy sprite type 16

   @property Q.SPRITE_ENEMY
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_ENEMY    = 16;


  /**
   powerup sprite type 32

   @property Q.SPRITE_POWERUP
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_POWERUP  = 32;


  /**
   UI sprite type 64

   @property Q.SPRITE_UI
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_UI       = 64;

  /**
   all sprite type - 0xFFFF

   @property Q.SPRITE_ALL
   @for Quintus.Sprites
   @final
  */
  Q.SPRITE_ALL   = 0xFFFF;


  /**
   generate a square set of  `p.points` on an object from `p.w` and `p.h`

   `p.points` represent the collision points for an object in object coordinates.


    @method q._generatePoints
    @for Quintus.Sprites
    @param {Q.Sprite} obj - object to add points to
    @param {Boolean} force - if set to true, will regenerate `p.points` even if it already exists, otherwise  if p.points exist it'll be left alone
  */
  Q._generatePoints = function(obj,force) {
    if(obj.p.points && !force) { return; }
    var p = obj.p,
        halfW = p.w/2,
        halfH = p.h/2;

    p.points = [
      [ -halfW, -halfH ],
      [  halfW, -halfH ],
      [  halfW,  halfH ],
      [ -halfW,  halfH ]
      ];
  };


  /**
   Generate a square set of  `c.points` on an object from the object transform matrix and `p.points`

   `c.points` represents the collision points of an sprite in world coordinates, scaled, rotate and taking into account any parent transforms.


    @method Q._generateCollisionPoints
    @for Quintus.Sprites
    @param {q.sprite} obj - object to add collision points to
  */
 Q._generateCollisionPoints = function(obj) {
    if(!obj.matrix && !obj.refreshMatrix) { return; }
    if(!obj.c) { obj.c = { points: [] }; }
    var p = obj.p, c = obj.c;

    if(!p.moved &&
       c.origX === p.x &&
       c.origY === p.y &&
       c.origScale === p.scale &&
       c.origAngle === p.angle) {
        return;
    }

    c.origX = p.x;
    c.origY = p.y;
    c.origScale = p.scale;
    c.origAngle = p.angle;

    obj.refreshMatrix();

    var i;

    // Early out if we don't need to rotate / scale / deal with a container
    if(!obj.container && (!p.scale || p.scale === 1) && p.angle === 0) {
      for(i=0;i<obj.p.points.length;i++) {
        obj.c.points[i] = obj.c.points[i] || [];
        obj.c.points[i][0] = p.x + obj.p.points[i][0];
        obj.c.points[i][1] = p.y + obj.p.points[i][1];
      }
      c.x = p.x; c.y = p.y;
      c.cx = p.cx; c.cy = p.cy;
      c.w = p.w; c.h = p.h;
    } else {
      var container = obj.container || Q._nullContainer;

      c.x = container.matrix.transformX(p.x,p.y);
      c.y = container.matrix.transformY(p.x,p.y);
      c.angle = p.angle + container.c.angle;
      c.scale = (container.c.scale || 1) * (p.scale || 1);

      var minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

      for(i=0;i<obj.p.points.length;i++) {
        if(!obj.c.points[i]) {
          obj.c.points[i] = [];
        }
        obj.matrix.transformArr(obj.p.points[i],obj.c.points[i]);
        var x = obj.c.points[i][0],
        y = obj.c.points[i][1];

        if(x < minX) { minX = x; }
        if(x > maxX) { maxX = x; }
        if(y < minY) { minY = y; }
        if(y > maxY) { maxY = y; }
      }

      if(minX === maxX) { maxX+=1; }
      if(minY === maxY) { maxY+=1; }

      c.cx = c.x - minX;
      c.cy = c.y - minY;

      c.w = maxX - minX;
      c.h = maxY - minY;
    }

    p.moved = false;

    // TODO: Invoke moved on children
    if(obj.children && obj.children.length > 0) {
      Q._invoke(obj.children,"moved");
    }
  };


  /**

   Basic sprite class - will render either and asset or a frame from a sprite sheet.

   Auto sets the width and height (`p.w` and `p.h`) from the provided image asset and
   centers the sprite so 0,0 is the center of the provide image.

   Most of the times you'll sub-class `Q.Sprite`

   @extends Q.GameObject
   @class Q.Sprite
   @for Quintus.Sprites
  */
  Q.GameObject.extend("Sprite",{

    /**

      Default sprite constructor, takes in a set of properties and a set of default properties (useful when you create a subclass of sprite)

      Default properties:

           {
            asset: null,  // asset to use
            sheet: null,  // sprite sheet to use (overrides asset)
            x: 0,
            y: 0,
            z: 0,
            w: 0,         // width, set from p.asset or p.sheet
            h: 0,         // height, set from p.asset or p.sheet
            cx: w/2,      // center x, defaults to center of the asset or sheet
            cy: h/2,      // center y, default same as cx
            // points defines the collision shape, override to customer the collision shape,
            // must be a convex polygon in clockwise order
            points: [  [ -w/2, -h/2 ], [  w/2, -h/2 ], [  w/2,  h/2 ], [ -w/2,  h/2 ] ],
            opacity: 1,
            angle: 0,
            frame: 0
            type:  Q.SPRITE_DEFAULT | Q.SPRITE_ACTIVE,
            name: '',
            sort: false,   // set to true to force children to be sorted by theier p.z,
            hidden: false,  // set to true to hide the sprite
            flip: ""       // set to "x", "y", or "xy" to flip sprite over that dimension
           }

      @method init
      @for Q.Sprite
      @param {Object} props - property has that will be turned into `p`
      @param {Object} [defaultProps] - default properties that are assigned only if there's not a corresponding value in `props`
    */
    init: function(props,defaultProps) {
      this.p = Q._extend({
        x: 0,
        y: 0,
        z: 0,
		opacity: 1,
        angle: 0,
        frame: 0,
        type: Q.SPRITE_DEFAULT | Q.SPRITE_ACTIVE,
        name: '',
        spriteProperties: {}
      },defaultProps);

      this.matrix = new Q.Matrix2D();
      this.children = [];

      Q._extend(this.p,props);

      this.size();
      this.p.id = this.p.id || Q._uniqueId();

      this.refreshMatrix();
    },

    /**
    Resets the width, height and center based on the
     asset or sprite sheet

    @method size
    @for Q.Sprite
    @param {Boolean} force - force a reset (call if w or h changes)
    */
    size: function(force) {
      if(force || (!this.p.w || !this.p.h)) {
        if(this.asset()) {
          this.p.w = this.asset().width;
          this.p.h = this.asset().height;
        } else if(this.sheet()) {
          this.p.w = this.sheet().tileW;
          this.p.h = this.sheet().tileH;
        }
      }

      this.p.cx = (force || this.p.cx === void 0) ? (this.p.w / 2) : this.p.cx;
      this.p.cy = (force || this.p.cy === void 0) ? (this.p.h / 2) : this.p.cy;
    },

    /**
    Get or set the asset associate with this sprite

    @method asset
    @for Q.Sprite
    @param {String} [name] - leave empty to return the asset, add to set the asset
    @param {Boolean} [resize] - force a call to `size()` and `_generatePoints`
    */
    asset: function(name,resize) {
      if(!name) { return Q.asset(this.p.asset); }

      this.p.asset = name;
      if(resize) {
        this.size(true);
        Q._generatePoints(this,true);
      }
    },

    /**

     Get or set the sheet associate with this sprite

     @method sheet
     @for Q.Sprite
     @param {String} [name] - leave empty to return the sprite sheet, add to resize
     @param {Boolean} [resize] - force a resize
    */
    sheet: function(name,resize) {
      if(!name) { return Q.sheet(this.p.sheet); }

      this.p.sheet = name;
      if(resize) {
        this.size(true);
        Q._generatePoints(this,true);
      }
    },

    /**
     Hide the sprite (render returns without rendering)

     @method hide
     @for Q.Sprite
    */
    hide: function() {
      this.p.hidden = true;
    },

    /**
     Show the sprite

     @method show
     @for Q.Sprite
    */
    show: function() {
      this.p.hidden = false;
    },

    /**
     Set a set of `p` properties on a Sprite

     @method set
     @for Q.Sprite
     @param {Object} properties - hash of properties to set
    */
    set: function(properties) {
      Q._extend(this.p,properties);
      return this;
    },

    _sortChild: function(a,b) {
      return ((a.p && a.p.z) || -1) - ((b.p && b.p.z) || -1);
    },

    _flipArgs: {
      "x":  [ -1,  1],
      "y":  [  1, -1],
      "xy": [ -1, -1]
    },

    /**
     Default render method for the sprite. Don't overload this unless you want to
     handle all the transform and scale stuff yourself. Rather overload the `draw` method.

     @method render
     @for Q.Sprite
     @param {Context2D} ctx - context to render to
    */
    render: function(ctx) {
      var p = this.p;

      if(p.hidden || p.opacity === 0) { return; }
      if(!ctx) { ctx = Q.ctx; }

      this.trigger('predraw',ctx);

      ctx.save();

        if(this.p.opacity !== void 0 && this.p.opacity !== 1) {
          ctx.globalAlpha = this.p.opacity;
        }

        this.matrix.setContextTransform(ctx);

        if(this.p.flip) { ctx.scale.apply(ctx,this._flipArgs[this.p.flip]); }

        this.trigger('beforedraw',ctx);
        this.draw(ctx);
        this.trigger('draw',ctx);

      ctx.restore();

      // Children set up their own complete matrix
      // from the base stage matrix
      if(this.p.sort) { this.children.sort(this._sortChild); }
      Q._invoke(this.children,"render",ctx);

      this.trigger('postdraw',ctx);

      if(Q.debug) { this.debugRender(ctx); }

    },

    /**
     Center sprite inside of it's container (or the stage)

     @method center
     @for Q.Sprite
    */
    center: function() {
      if(this.container) {
        this.p.x = 0;
        this.p.y = 0;
      } else {
        this.p.x = Q.width / 2;
        this.p.y = Q.height / 2;
      }

    },

    /**
     Draw the asset on the stage. the context passed in is alreay transformed.

     All you need to do is a draw the sprite centered at 0,0

     @method draw
     @for Q.Sprite
     @param {Context2D} ctx
    */
    draw: function(ctx) {
      var p = this.p;
      if(p.sheet) {
        this.sheet().draw(ctx,-p.cx,-p.cy,p.frame);
      } else if(p.asset) {
        ctx.drawImage(Q.asset(p.asset),-p.cx,-p.cy);
      } else if(p.color) {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.cx,-p.cy,p.w,p.h);
      }
    },

    debugRender: function(ctx) {
      if(!this.p.points) {
        Q._generatePoints(this);
      }
      ctx.save();
      this.matrix.setContextTransform(ctx);
      ctx.beginPath();
      ctx.fillStyle = this.p.hit ? "blue" : "red";
      ctx.strokeStyle = "#FF0000";
      ctx.fillStyle = "rgba(0,0,0,0.5)";

      ctx.moveTo(this.p.points[0][0],this.p.points[0][1]);
      for(var i=0;i<this.p.points.length;i++) {
        ctx.lineTo(this.p.points[i][0],this.p.points[i][1]);
      }
      ctx.lineTo(this.p.points[0][0],this.p.points[0][1]);
      ctx.stroke();
      if(Q.debugFill) { ctx.fill(); }

      ctx.restore();

      if(this.c) {
        var c = this.c;
        ctx.save();
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#FF00FF";
          ctx.beginPath();
          ctx.moveTo(c.x - c.cx,       c.y - c.cy);
          ctx.lineTo(c.x - c.cx + c.w, c.y - c.cy);
          ctx.lineTo(c.x - c.cx + c.w, c.y - c.cy + c.h);
          ctx.lineTo(c.x - c.cx      , c.y - c.cy + c.h);
          ctx.lineTo(c.x - c.cx,       c.y - c.cy);
          ctx.stroke();
        ctx.restore();
      }
    },

    /**
     Update method is called each step with the time elapsed since the last step.

     Doesn't do anything other than trigger events, call a `step` method if defined
     and run update on all its children.

     Generally leave this method alone and define a `step` method that will be called

     @method update
     @for Q.Sprite
     @param {Float} dt - time elapsed since last call
    */
    update: function(dt) {
      this.trigger('prestep',dt);
      if(this.step) { this.step(dt); }
      this.trigger('step',dt);
      Q._generateCollisionPoints(this);

      // Ugly coupling to stage - workaround?
      if(this.stage && this.children.length > 0) {
        this.stage.updateSprites(this.children,dt,true);
      }

      // Reset collisions if we're tracking them
      if(this.p.collisions) { this.p.collisions = []; }
    },

    /*
     Regenerates this sprite's transformation matrix

     @method refreshMatrix
     @for Q.Sprite
    */
    refreshMatrix: function() {
      var p = this.p;
      this.matrix.identity();

      if(this.container) { this.matrix.multiply(this.container.matrix); }

      this.matrix.translate(p.x,p.y);

      if(p.scale) { this.matrix.scale(p.scale,p.scale); }

      this.matrix.rotateDeg(p.angle);
    },

    /*
     Marks a sprite as having been moved

     @method moved
     @for Q.Sprite
    */
    moved: function() {
      this.p.moved = true;
    }
  });

  /**
   Simple sprite that adds in basic newtonian physics on each step:

       p.vx += p.ax * dt;
       p.vy += p.ay * dt;

       p.x += p.vx * dt;
       p.y += p.vy * dt;

   @class Q.MovingSprite
   @extends Q.Sprite
   @for Quintus.Sprites
  */
  Q.Sprite.extend("MovingSprite",{
    init: function(props,defaultProps) {
      this._super(Q._extend({
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0
      },props),defaultProps);
   },

   step: function(dt) {
     var p = this.p;

     p.vx += p.ax * dt;
     p.vy += p.ay * dt;

     p.x += p.vx * dt;
     p.y += p.vy * dt;
   }
 });




  return Q;
};


};


if(typeof Quintus === 'undefined') {
  module.exports = quintusSprites;
} else {
  quintusSprites(Quintus);
}
