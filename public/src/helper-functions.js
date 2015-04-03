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