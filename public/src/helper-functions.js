"use strict";

// ## Helper functions


var makeScaledPoints = function (w, h, sf) {
  var points = [ [ -w/2 * sf, -h/2 * sf ], 
        [  w/2 * sf, -h/2 * sf], 
        [  w/2 * sf,  h/2 * sf ], 
        [ -w/2 * sf,  h/2 * sf ] ];
  return points;
}

var insertAllActors = function(stage) {
  for (var attrName in actors) {
    stage.insert(actors[attrName].player);
  }
};

/**
 * Finds the size of an object
 */
var sizeOfObject = function(obj) {
  var size = 0;
  for (var key in obj) {
    size++;
  }
  return size;
}

var each = function(obj,iterator,context) {
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

// Set the timer (timer tick starts only when the first player joins, and pauses when there are no players left or has reached 0)
var getTimeFormat = function(time){
  var secLeft = Math.floor(time % 60);
  var minLeft = Math.floor(time / 60);

  minLeft = minLeft < 10 ? "0" + minLeft : minLeft;
  secLeft = secLeft < 10 ? "0" + secLeft : secLeft;

  return minLeft + ":" + secLeft;
};