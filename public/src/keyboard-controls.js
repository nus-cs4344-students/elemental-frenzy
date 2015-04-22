"use strict";

// ## Keyboard controls
var KEYBOARD_CONTROLS_PLAYER = {
  '1': "toggleElement0",
  '2': "toggleElement1",
  '3': "toggleElement2",
  '4': "toggleElement3",
  M : "toggleMiniMap",
  Q : "togglePreviousElement",
  E : "toggleNextElement",
  W : "up",
  S : "down",
  A : "left",
  D : "right",
  SPACE : "up",
  Z : "",
  TAB : "displayScoreScreen",
  LEFT : "",
  UP : "",
  DOWN : "",
  RIGHT : "",
};

var KEYBOARD_CONTROLS_SESSION = {
  M : "toggleMiniMap",
  W : "",
  S : "",
  A : "",
  D : "",
  SPACE : "",
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
};

var TOUCH_CONTROLS_PLAYER = [ 
  ['left','<' ],
  ['right','>' ],
  [],
  [],
  [],  // use an empty array as a spacer
  ['up','^'],
  ['down', 'v'],
  ['toggleNextElement', 'next'],
  ['displayScoreScreen', 'score']
];

var TOUCH_CONTROLS_SESSION = [ 
  ['server_left','<' ],
  ['server_right','>' ],
  ['server_up','^'],
  [],
  [],
  [],
  ['server_down','v'],
  ['toggleFollow', 'tf'],
  ['stopFollow', 'sf'],
  ['displayScoreScreen', 'score']
];