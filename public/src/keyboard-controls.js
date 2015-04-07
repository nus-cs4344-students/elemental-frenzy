"use strict";

// ## Keyboard controls
var KEYBOARD_CONTROLS_PLAYER = {
  W : "up",
  S : "down",
  A : "left",
  D : "right",
  SPACE : "toggleNextElement",
  Z : "",
  TAB : "displayScoreScreen",
  LEFT : "",
  UP : "",
  DOWN : "",
  RIGHT : "",
};

var TOUCH_CONTROLS_PLAYER = [ 
  ['left','<' ],
  ['right','>' ],
  [],  // use an empty array as a spacer
  ['up','^'],
  ['toggleNextElement', 'next'],
  ['displayScoreScreen', 'score']
];

var TOUCH_CONTROLS_SESSION = [ 
  ['server_left','<' ],
  ['server_right','>' ],
  ['server_up','^'],
  ['server_down','v'],
  ['toggleFollow', 'tf'],
  ['stopFollow', 'sf'],
  ['displayScoreScreen', 'score']
];

var KEYBOARD_CONTROLS_SESSION = {
  W : "up",
  S : "down",
  A : "left",
  D : "right",
  SPACE : "toggleNextElement",
  Z : "",
  TAB : "displayScoreScreen",
  LEFT : "server_left",
  UP : "server_up",
  DOWN : "server_down",
  RIGHT : "server_right",
  F : "toggleFollow",
  G : "stopFollow"
};

var KEYBOARD_CONTROLS_SESSION_ONLY = {
  "server_left": "server_left",
  "server_up": "server_up",
  "server_down": "server_down",
  "server_right": "server_right",
  "toggleFollow": "toggleFollow",
  "stopFollow": "stopFollow"
}