"use strict";

// ## Connect to the server
var HOSTNAME = "localhost";
var PORT = 4343;
var io = io();
var socket = io.connect("http://" + HOSTNAME + ":" + PORT);

// ## Stage constants (higher number will render OVER lower number)
var STAGE_BACKGROUND = 0;
var SCENE_BACKGROUND = 'background';
var STAGE_LEVEL = 1;
var STAGE_WELCOME = 2;
var SCENE_WELCOME = 'welcomeScreen';

//change this maybe? currently they use 1 for the game over button
var STAGE_GAME_OVER_BUTTON = 4;
var STAGE_UI = 5;

var _assetsLoaded = false; // Global variable to be checked before trying to load game

// # Quintus platformer example
//
// [Run the example](../quintus/examples/platformer/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a level json file.
//
// This is the example from the website homepage, it consists
// a simple, non-animated platformer with some enemies and a 
// target for the player.
window.addEventListener("load",function() {

// Set up an instance of the Quintus engine  and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = window.Q = Quintus({audioSupported: [ 'ogg','mp3', 'wav' ],
                            imagePath: "/images/",
                            audioPath: "/audio/",
                            dataPath: "/data/"
                          })
                          .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio")
                          // Maximize this game to whatever the size of the browser is
                          .setup({ maximize: true })
                          // And turn on default input controls and touch input (for UI)
                          .controls().touch()
                          .enableSound();
    

// ## Set socket event listeners
require(['./src/session-socket']);
// ## Helper functions
require(['src/helper-functions']);
// ## Set keyboard controls
require(['src/keyboard-controls'], function() {
  Q.input.keyboardControls(KEYBOARD_CONTROLS);
});
// ## HUD
require(['src/user-interface']);
// ## Game state
require(['src/game-state']);
// ## Components to be used by eleballs/players/actors
require(['src/components']);
// ## Eleball sprites
require(['src/eleballs']);
// ## Player sprite
require(['src/player']);
// ## Ladder sprite
require(['src/ladder']);
// ## Actor sprite (other players)
require(['src/actor']);
// ## Enemy sprite
require(['src/enemy-ai']);
// ## Tower sprite
require(['src/tower']);
// ## Scenes for the game
require(['src/scenes']);

// ## Asset Loading and Game Launch
// Q.load can be called at any time to load additional assets
// assets that are already loaded will be skipped
// The callback will be triggered when everything is loaded
Q.load("npcs.png, npcs.json, level1.json, level2.json, tiles.png, background-wall.png, level3.json, \
    elemental_balls.png, elemental_balls.json, \
    character_orc.png, character_orc.json, \
    character_skeleton.png, character_skeleton.json, \
    character_earth.png, character_earth.json, \
    character_lightning.png, character_lightning.json, \
    character_water.png, character_water.json, \
    character_fire.png, character_fire.json, \
    map_tiles.png, ladder.png, ladder.json", function() {

   // Sprites sheets can be created manually
  Q.sheet("tiles","tiles.png", { tilew: 32, tileh: 32 });
  Q.sheet("map_tiles", "map_tiles.png", { tilew: 32, tileh: 32 });
  // Or from a .json asset that defines sprite locations
  Q.compileSheets("character_orc.png", "character_orc.json");
  Q.compileSheets("character_skeleton.png", "character_skeleton.json");
  Q.compileSheets("character_earth.png", "character_earth.json");
  Q.compileSheets("character_lightning.png", "character_lightning.json");
  Q.compileSheets("character_water.png", "character_water.json");
  Q.compileSheets("character_fire.png", "character_fire.json");
  Q.compileSheets("npcs.png", "npcs.json");
  Q.compileSheets("elemental_balls.png", "elemental_balls.json");
  Q.compileSheets("ladder.png", "ladder.json");
  
  _assetsLoaded = true;
});

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify level2.json to change the level around and add in some more enemies.
// 2. Add in a second level by creating a level2.json and a level2 scene that gets
//    loaded after level 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.



});
