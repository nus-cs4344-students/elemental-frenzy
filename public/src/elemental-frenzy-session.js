"use strict";

requirejs.config({
    //Remember: only use shim config for non-AMD scripts,
    //scripts that do not already call define(). The shim
    //config will not work correctly if used on AMD scripts,
    //in particular, the exports and init config will not
    //be triggered, and the deps config will be confusing
    //for those cases.
    shim: {
        'aura':{
          deps: ['powerup']
        },
        'scenes': {
            //These script dependencies should be loaded before loading
            //scenes.js
            deps: ['helper-functions', 'keyboard-controls',
                  'game-state', 'components',
                  'eleballs', 'player', 'actor', 'enemy-ai',
                  'tower', 'ladder', 'powerup', 'aura']//,
            
            //Once loaded, use the global 'Scenes' as the
            //module value.
            
            // exports: 'Scenes'
        },
        'session-socket':{
          deps: ['helper-functions']
        }
    }
});


// ## Set socket event listeners
// require(['session-socket'], function(){console.log('session-socket loaded');});
require(['session-socket']);

var _assetsLoaded = false; // Global variable to be checked before trying to load game

// To find out why DomReady is used
// Refer to http://requirejs.org/docs/api.html#pageload
require(['./../lib/domReady'], function (domReady) {
  domReady(function () {
    //This function is called once the DOM is ready.
    //It will be safe to query the DOM and manipulate
    //DOM nodes in this function.
    
    //console.log('Dom Ready');

    startSession();
  });
});

var TOUCHABLE_STAGES = [15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0];

var startSession = function() {

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
                          .setup({ maximize: true });
                          //.enableSound();

// And turn on default input controls and touch input (for UI)
Q.touch(Q.SPRITE_UI, TOUCHABLE_STAGES);

Q.scene("loading",function(stage) {

    var text = "Shaping the maps";
    stage.insert(new Q.UI.Text({
      label: text,
      x: Q.width/2,
      y: Q.height/2
    }));

    // var dots = [".","..","...","....",""];
    var dots = "..........";
    var load = stage.insert(new Q.UI.Text({
      label: " ",
      x: Q.width/2,
      y: Q.height*0.55
    }));

    var count = 0;
    var interval = setInterval(function(){

      if(_assetsLoaded){
        clearInterval(interval);
      }

      load.p.label = dots.substring(0, (count%dots.length));
      count++;
    }, 150);
});

Q.stageScene("loading", 0);

// ## Asset Loading and Game Launch
// Q.load can be called at any time to load additional assets
// assets that are already loaded will be skipped
// The callback will be triggered when everything is loaded
Q.load("level1.json, level2.json, background-wall.png, level3.json, \
    elemental_balls.png, elemental_balls.json, \
    character_orc.png, character_orc.json, \
    character_skeleton.png, character_skeleton.json, \
    character_earth.png, character_earth.json, \
    character_lightning.png, character_lightning.json, \
    character_water.png, character_water.json, \
    character_fire.png, character_fire.json, \
    aura.png, aura.json, \
    map_tiles.png, \
    ladder.png, ladder.json, \
    hud.png, hud.json, \
    powerups.png, powerups.json,\
    scoreboard.png, scoreboard.json, \
    hastePowerUp.ogg, healthPowerUp.ogg, \
    manaPowerUp.ogg, manaInsufficient.ogg, \
    damagePowerUp.ogg, dmghpmpup.ogg, \
    bossSpawn.ogg, victorious.ogg, \
    warningSiren.ogg, theBattle.ogg", function() {

   // Sprites sheets can be created manually
  Q.sheet("map_tiles", "map_tiles.png", { tilew: 32, tileh: 32 });
  // Or from a .json asset that defines sprite locations
  Q.compileSheets("character_orc.png", "character_orc.json");
  Q.compileSheets("character_skeleton.png", "character_skeleton.json");
  Q.compileSheets("character_earth.png", "character_earth.json");
  Q.compileSheets("character_lightning.png", "character_lightning.json");
  Q.compileSheets("character_water.png", "character_water.json");
  Q.compileSheets("character_fire.png", "character_fire.json");
  Q.compileSheets("elemental_balls.png", "elemental_balls.json");
  Q.compileSheets("ladder.png", "ladder.json");
  Q.compileSheets("hud.png", "hud.json");
  Q.compileSheets("powerups.png", "powerups.json");
  Q.compileSheets("scoreboard.png", "scoreboard.json");
  Q.compileSheets("aura.png", "aura.json");
  // console.log('Asset loaded');

  require([ 'keyboard-controls',
            'components', 
            'eleballs', 
            'player',
            'actor',
            'enemy-ai',
            'tower',
            'ladder',
            'helper-functions',
            'game-state',
            'scenes'], function(){
    
    Q.input.keyboardControls(KEYBOARD_CONTROLS_SESSION);
    Q.input.touchControls({controls: TOUCH_CONTROLS_SESSION});

    _assetsLoaded = true;
  });
  
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
};
