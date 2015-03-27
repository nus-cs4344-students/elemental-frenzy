"use strict";

// ## Helper functions
var cloneObject = function (obj){
  var theClone = {};
  for(var oKey in obj){
    var item = obj[oKey];
    if(item instanceof Array){
      theClone[oKey] = cloneArray(item);
    }else if(typeof item === 'object') {
      theClone[oKey] = cloneObject(item);
    }else{
      theClone[oKey] = item;
    }
  }

  return theClone;
};

var cloneArray = function (arr){
  var theClone = [];
  for(var i = 0; i<arr.length; i++){
    var item = arr[i];
    if(item instanceof Array){
      theClone.push(cloneArray(item));
    }else if(typeof item === 'object') {
      theClone.push(cloneObject(item));
    }else{
      theClone.push(item);
    }
  }
  return theClone;
};

var clone = function(item){
  if(item instanceof Array){
    return cloneArray(item);
  }else if(typeof item === 'object') {
    return cloneObject(item);
  }else{
    return item;
  }
};

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
  var ret = clone(obj2);
  if (typeof ret === 'undefined') {
    ret = {};
  }
  for (var attrName in obj1) {
    ret[attrName] = clone(obj1[attrName]);
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