"use strict";

// ## Helper functions

var makeScaledPoints = function (w, h, sf) {
  var points = [ [ -w/2 * sf, -h/2 * sf ], 
        [  w/2 * sf, -h/2 * sf], 
        [  w/2 * sf,  h/2 * sf ], 
        [ -w/2 * sf,  h/2 * sf ] ];
  return points;
}

// Merges obj1 and obj2 together and returns it, but obj1 attributes will take priority over the same attributes of obj2. 
// E.g. var obj1 = {food : 'pizza', drink : 'cola'}, obj2 = {food : 'lasagna', dessert : 'icecream'}
//    returned object = {food : 'pizza', drink : 'cola', dessert : 'icecream'}
var mergeObjects = function(obj1, obj2) {
  var ret = {};
  for (var attrName in obj2) {
    ret[attrName] = obj2[attrName];
  }
  for (var attrName in obj1) {
    ret[attrName] = obj1[attrName];
  }
  return ret;
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