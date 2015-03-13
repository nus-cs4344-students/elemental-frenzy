"use strict";

// # Constants
// ## Eleball constants
var ELEBALL_DEFAULT_VX = 150;
var ELEBALL_DEFAULT_VY = 150;
var ELEBALL_DEFAULT_DMG = 5;
// Element indices (0: fire, 1: earth, 2: lightning, 3: water, 0 > 1 > 2 > 3 > 0)
var ELEBALL_ELEMENT_FIRE = 0;
var ELEBALL_ELEMENT_EARTH = 1;
var ELEBALL_ELEMENT_LIGHTNING = 2;
var ELEBALL_ELEMENT_WATER = 3;
var ELEBALL_ELEMENTNAMES = ["element_fire", "element_earth", "element_lightning", "element_water"];
// TODO Change the sound files once they are ready
var ELEBALL_ELEMENTSOUNDS = ["fireBall.ogg", "earthBall.ogg", "lightningBall.ogg", "waterBall.ogg"];
var ELEBALL_DEFAULT_ELEMENT = 0; // water
var ELEBALL_DOWN_FRAME = 0;
var ELEBALL_LEFT_FRAME = 1;
var ELEBALL_RIGHT_FRAME = 2;
var ELEBALL_UP_FRAME = 3;
var ELEBALL_BOUNDINGBOX_SF = 0.5;

// ## Player constants
var PLAYER_NAME = 'yip';
var PLAYER_DEFAULT_MAXHEALTH = 50;
var PLAYER_DEFAULT_COOLDOWN = 0.5;
var PLAYER_DEFAULT_DMG = 2;
var PLAYER_DEFAULT_ELEMENT = 0; // fire

// ## Enemy constants
var ENEMY_DEFAULT_MAXHEALTH = 50;
var ENEMY_DEFAULT_COOLDOWN = 1.0;
var ENEMY_DEFAULT_DMG = 2;
var ENEMY_ELEBALL_DEFAULT_DMG = 5;
var ENEMY_DEFAULT_ELEMENT = 0; // fire

// ## Healthbar constants
var HEALTHBAR_WIDTH_SF = 1.5;
var HEALTHBAR_HEIGHT_SF = 0.2;
var HEALTHBAR_HEIGHT_OFFSET = 5;

// # Help functions
var makeScaledPoints = function (w, h, sf) {
	var points = [ [ -w/2 * sf, -h/2 * sf ], 
				[  w/2 * sf, -h/2 * sf], 
				[  w/2 * sf,  h/2 * sf ], 
				[ -w/2 * sf,  h/2 * sf ] ];
	return points;
}

var useDefaultIfUndefined = function (prop, def) {
	if (typeof prop === 'undefined') {
		return def;
	} else {
		return prop;
	}
}

// Merges obj1 and obj2 together and returns it, but obj1 attributes will take priority over the same attributes of obj2. 
// E.g. var obj1 = {food : 'pizza', drink : 'cola'}, obj2 = {food : 'lasagna', dessert : 'icecream'}
//		returned object = {food : 'pizza', drink : 'cola', dessert : 'icecream'}
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
var Q = window.Q = Quintus({ audioSupported: [ 'ogg','mp3', 'wav' ] })
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio")
        // Maximize this game to whatever the size of the browser is
        .setup({ maximize: true })
        // And turn on default input controls and touch input (for UI)
        .controls().touch()
		.enableSound();

// Load element sounds
for (var i = 0; i < ELEBALL_ELEMENTSOUNDS.length; i++) {
	Q.load(ELEBALL_ELEMENTSOUNDS[i]);
}
		
// ## Keyboard controls
Q.input.keyboardControls({
	W : "fire_up",
	S : "fire_down",
	A : "fire_left",
	D : "fire_right",
	SPACE : "toggleNextElement",
});
// ## Mouse events
Q.el.addEventListener('mousemove',function(e) {
	console.log("mousemove detected");
});
Q.el.addEventListener('mouseup',function(e) {
	console.log("mouseup detected");
});
Q.el.addEventListener('mousedown',function(e) {
	console.log("mousedown detected");
});

// ## Game State
Q.state.reset({
	kills : [],
	deaths : []
});
// # Set listeners for the game state
// # When player dies, update the kills of the killer and the deaths of the victim
Q.state.on("playerDied", function(victim, killer) {
	if (typeof Q.state.p.kills[killer] === 'undefined') {
		Q.state.p.kills[killer] = 0;
	}
	if (typeof Q.state.p.deaths[victim] === 'undefined') {
		Q.state.p.deaths[victim] = 0;
	}
	Q.state.p.kills[killer]++;
	Q.state.p.deaths[victim]++;
	console.log("Kills for player " + killer + " is " + Q.state.p.kills[killer]);
	console.log("Deaths for player " + victim + " is " + Q.state.p.deaths[victim]);
});
// # When enemy dies, update the kills of the killer only
Q.state.on("enemyDied", function(killer) {
	if (typeof killer === 'undefined') {
		return;
	}
	
	if (typeof Q.state.p.kills[killer] === 'undefined') {
		Q.state.p.kills[killer] = 0;
	}
	Q.state.p.kills[killer]++;
	console.log("Kills for player " + killer + " is " + Q.state.p.kills[killer]);
});

// ## Healthbar component to be attached to an entity with currentHealth and maxHealth
Q.component("healthBar", {
	draw: function(ctx) {
		var hf = this.entity.p.currentHealth / this.entity.p.maxHealth;
		var width = this.entity.p.w * HEALTHBAR_WIDTH_SF;
		var height = this.entity.p.h * HEALTHBAR_HEIGHT_SF;
		ctx.fillStyle = '#FF0000';
		ctx.fillRect(-width/2, -this.entity.p.cy - height - HEALTHBAR_HEIGHT_OFFSET,
					width * hf, height);
		ctx.fillStyle = "black";
		ctx.strokeRect(-width/2, -this.entity.p.cy - height - HEALTHBAR_HEIGHT_OFFSET,
					width, height);
	}
});

// ## 2dEleball component that is an extension of the '2d' component provided by Quintus (in Quintus_2d.js)
// 	Modifies what happens on collision with another eleball
Q.component('2dEleball', {
	added: function() {
		var entity = this.entity;
		Q._defaults(entity.p,{
			vx: 0,
			vy: 0,
			ax: 0,
			ay: 0,
			gravity: 0, // Eleballs have no gravity
			type: Q.SPRITE_PARTICLE, // Eleballs are particles
			collisionMask: Q.SPRITE_ALL // Eleballs collide with anything
		});
		entity.on('step',this,"step");
		entity.on('hit',this,"collision");
	},

	// Eleballs get destroyed when touching things, and may play a sound if soundIsAnnoying is set to false
	// Eleballs may also cancel out fireballs
	// Eleball elements and their indices:
	// [0: fire, 1: earth, 2: lightning, 3: water]
	// Logic for eleball collision:
	//	- Case 1: Both gets destroyed if their elements are the same
	//	- Case 2: this element of index i destroys the other element of index j
	//				and continues on its path if (j-i) == 1 or (i-j) == (numElements-1)
	//	- Case 3: Both elements pass through each other if |i-j| == 2
	collision: function(col,last) {
		// Don't collide with the shooter of the eleball
		if (col.obj.isA("Player") && col.obj.p.name == this.entity.p.name) {
			return;
		}
		
		var entity = this.entity;
		var other = col.obj;
		if (other.has("2dEleball")) {
			// Eleball - eleball collision
			console.log("Eleball-eleball collision");
			var i = entity.p.element,
				j = other.p.element;
			console.log("i = " + i + " j = " + j);
			if (i == j) {
				// Case 1, destroy each other
				console.log("Case 1, " + ELEBALL_ELEMENTNAMES[i] 
							+ " destroys and gets destroyed by " + ELEBALL_ELEMENTNAMES[j]);
				entity.destroy();
				// Play sound
				if ( !entity.p.soundIsAnnoying) {
					Q.audio.play(ELEBALL_ELEMENTSOUNDS[i]);
				}
			} else if ( (j-i == 1) || (j-i == 1-ELEBALL_ELEMENTNAMES.length) ){
				// Case 2, this eleball destroys the other and passes through
				console.log("Case 2, " + ELEBALL_ELEMENTNAMES[i] 
							+ " destroys " + ELEBALL_ELEMENTNAMES[j]);
				other.destroy();
				// Play sound
				if ( !other.p.soundIsAnnoying) {
					Q.audio.play(ELEBALL_ELEMENTSOUNDS[j]);
				}
			} else if (Math.abs(i-j) == 2) {
				console.log("Case 3, " + ELEBALL_ELEMENTNAMES[i] 
							+ " passes through " + ELEBALL_ELEMENTNAMES[j]);
			}
			entity.trigger("onHit", col);
		} else {
			entity.trigger("onHit", col);
			entity.destroy();
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

// ## Own Eleball Sprite
Q.Sprite.extend("Eleball", {
	
	init: function(p, defaultP) {
		
		// merge p and defaultP, where attributes in p will override those in defaultP
		p = mergeObjects(p, defaultP);
		
		this._super(p, {
			element : ELEBALL_DEFAULT_ELEMENT,
			sheet : ELEBALL_ELEMENTNAMES[ELEBALL_DEFAULT_ELEMENT],
			frame : 0,
			soundIsAnnoying : false,
			vx : 0,
			vy : 0,
			scale : 0.9,
			x : 0,
			y : 0,
			dmg : ELEBALL_DEFAULT_DMG,
			shooter : "..no_name..",
			type : Q.SPRITE_PARTICLE,
			collisionMask : Q.SPRITE_ALL
		});	

		// Set bounding box smaller
		this.p.points = makeScaledPoints(this.p.w, this.p.h, ELEBALL_BOUNDINGBOX_SF);

		this.add("2dEleball");
		
		this.on("onHit", this, "onHit");
		
		// Play fire sound when eleball is launched
		if ( !this.p.soundIsAnnoying) {
			Q.audio.play(ELEBALL_ELEMENTSOUNDS[this.p.element]);
		}
	},

	onHit: function(collision) {
		console.log("onHit");
	},
	
	step: function(dt) {
		this.p.x += this.p.vx * dt;
		this.p.y += this.p.vy * dt;
	}
});

// ## Player Eleball Sprite
Q.Eleball.extend("PlayerEleball", {
	
	init: function(p, defaultP) {
	
		p = mergeObjects(p, defaultP);
		
		this._super(p);
	},
	
	// Player eleballs only damage enemies
	onHit: function(collision) {
		if (collision.obj.isA("Enemy")) {
			collision.obj.takeDamage(this.p.dmg, this.p.shooter);
		}
		this._super(collision);
	}
});

// ## Enemy Eleball Sprite
Q.Eleball.extend("EnemyEleball", {
	
	init: function(p, defaultP) {
	
		p = mergeObjects(p, defaultP);
		
		this._super(p, {
			dmg : ENEMY_ELEBALL_DEFAULT_DMG,
			collisionMask : Q.SPRITE_ALL ^ Q.SPRITE_ENEMY
		});	
	},
	
	// Enemy eleballs only damage players
	onHit: function(collision) {
		if (collision.obj.isA("Player")) {
			collision.obj.takeDamage(this.p.dmg, this.p.shooter);
		}
		this._super(collision);
	}
});

// ## Player Sprite
// The very basic player sprite, this is just a normal sprite
// using the player sprite sheet with default controls added to it.
Q.Sprite.extend("Player",{

  // the init constructor is called on creation
  init: function(p) {
	  
	var that = this;

    // You can call the parent's constructor with this._super(..)
    this._super(p, {
      sheet: "character_" + PLAYER_NAME,  // Setting a sprite sheet sets sprite width and height
	  sprite: "character_" + PLAYER_NAME,
      x: 410,           // You can also set additional properties that can
      y: 90,             // be overridden on object creation
	  cooldown: 0,		// can fire immediately
	  maxHealth: PLAYER_DEFAULT_MAXHEALTH,
	  currentHealth: PLAYER_DEFAULT_MAXHEALTH,
	  name: "no_name",
	  dmg: PLAYER_DEFAULT_DMG,
	  type: Q.SPRITE_ACTIVE,
	  element: PLAYER_DEFAULT_ELEMENT
    });
	
	// Add to the game state!
	// Kills = Deaths = 0
	if (Q.state.p.kills[this.p.name] != undefined) {
		Q.state.p.kills[this.p.name] = Q.state.p.kills[this.p.name] = 0;
	}

    // Add in pre-made components to get up and running quickly
    // The `2d` component adds in default 2d collision detection
    // and kinetics (velocity, gravity)
    // The `platformerControls` makes the player controllable by the
    // default input actions (left, right to move,  up or action to jump)
    // It also checks to make sure the player is on a horizontal surface before
    // letting them jump.
    this.add('2d, platformerControls, animation');

    // Write event handlers to respond hook into behaviors.
    // hit.sprite is called everytime the player collides with a sprite
    this.on("hit.sprite",function(collision) {
      // Check the collision, if it's the Tower, you win!
      if(collision.obj.isA("Tower")) {
        Q.stageScene("endGame",1, { label: "You Won!" }); 
        this.destroy();
      }
    });
	
	// Add healthbar
	this.add("healthBar");	
	
	// Event listener for firing (w,a,s,d keys)
	Q.input.on("fire_up, fire_down, fire_left, fire_right", function() {
		that.trigger("fire");
	});
	
	// Event listener for toggling elements using spacebar
	Q.input.on("toggleNextElement", function() {
		that.p.element = (that.p.element + 1) % ELEBALL_ELEMENTNAMES.length;
	});
	
	// Event listener for attacks
	this.on("fire", function() {
		if (this.p.cooldown > 0) {
			return;
		}
		
		var eleball = new Q.PlayerEleball({
			element : this.p.element,
			sheet : ELEBALL_ELEMENTNAMES[this.p.element],
			shooter : this.p.name
		});
		// Set the eleball directions and starting positions (with respect to the player) and velocity
		if (Q.inputs['fire_up']) {
			console.log("Firing up");
			// Set the eleball direction to UP
			eleball.p.frame = 0;
			// Set the eleball starting position above the player
			eleball.p.x = this.p.x;
			eleball.p.y = this.p.y - this.p.h/4 - eleball.p.h/2;
			// Set the eleball velocity
			eleball.p.vy = -ELEBALL_DEFAULT_VY;
		} else if (Q.inputs['fire_down']) {
			console.log("Firing down");
			eleball.p.frame = 0;
			eleball.p.x = this.p.x;
			eleball.p.y = this.p.y + this.p.h/4 + eleball.p.h/2;
			eleball.p.vy = ELEBALL_DEFAULT_VY;
		} else if (Q.inputs['fire_left']) {
			console.log("Firing left");
			eleball.p.frame = 0;
			eleball.p.y = this.p.y;
			eleball.p.x = this.p.x - this.p.w/4 - eleball.p.w/2;
			eleball.p.vx = -ELEBALL_DEFAULT_VX;
		} else if (Q.inputs['fire_right']){
			console.log("Firing right");
			eleball.p.frame = 0;
			eleball.p.y = this.p.y;
			eleball.p.x = this.p.x + this.p.w/4 + eleball.p.w/2;
			eleball.p.vx = ELEBALL_DEFAULT_VX;
		} else {
			eleball.destroy();
			return;
		}
		Q.stage().insert(eleball);
		this.p.cooldown = PLAYER_DEFAULT_COOLDOWN;
	});
  },
  
  takeDamage: function(dmg, shooter) {
	this.p.currentHealth -= dmg;
	console.log("Took damage. currentHealth = " + this.p.currentHealth);
	if (this.p.currentHealth <= 0) {
		Q.stageScene("endGame",1, { label: "You Died" }); 
		Q.state.trigger("playerDied", this.p.name, shooter);
		this.destroy();
	}  
  },
  
  step: function(dt) {
	  this.p.cooldown -= dt;
	  if (this.p.cooldown <= 0) {
		  this.p.cooldown = 0;
	  }

	  // player not jumping
	  if(this.p.vy ==0){
		// play running animation
		if (this.p.vx > 0) {
			this.play("run_right");
		} else if (this.p.vx < 0) {
			this.play("run_left");
		} else {
		  this.play("stand_front");
		}
	  }else{
	 	// player is jumping
	 	// play the still frame where the direction is
		if (this.p.vx > 0) {
			this.play("run_right_still");
		} else if (this.p.vx < 0) {
			this.play("run_left_still");
		}
		else {
		  this.play("stand_front");
		}
	  }
	   
  },
  
  draw: function(ctx) {
	  this._super(ctx);
	  this.healthBar.draw(ctx);
  }

});

// ## Tower Sprite
// Sprites can be simple, the Tower sprite just sets a custom sprite sheet
Q.Sprite.extend("Tower", {
  init: function(p) {
    this._super(p, { sheet: 'tower' });
  }
});

// ## Enemy Sprite
// Create the Enemy class to add in some baddies
Q.Sprite.extend("Enemy",{
	
  init: function(p) {
    this._super(p, { 
		sheet: 'enemy', 
		vx: 100,  
		type: Q.SPRITE_ENEMY,
		collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_PARTICLE ^ Q.SPRITE_ENEMY,
		shootRandomly: true,	// make enemy shoot randomly if true
		cooldown: 0,			// enemy has a cooldown as well
		dmg: ENEMY_DEFAULT_DMG,
		element: ENEMY_DEFAULT_ELEMENT,
		currentHealth: ENEMY_DEFAULT_MAXHEALTH,
		maxHealth: ENEMY_DEFAULT_MAXHEALTH
	});

    // Enemies use the Bounce AI to change direction 
    // whenver they run into something.
    this.add('2d, aiBounce, healthBar');

    // Listen for a sprite collision, if it's the player,
    // end the game unless the enemy is hit on top
    this.on("bump.left,bump.right,bump.bottom",function(collision) {
      if(collision.obj.isA("Player")) { 
		collision.obj.takeDamage(this.p.dmg);
      }
    });

    // If the enemy gets hit on the top, destroy it
    // and give the user a "hop"
    this.on("bump.top",function(collision) {
      if(collision.obj.isA("Player")) { 
        this.takeDamage(collision.obj.p.dmg);
        collision.obj.p.vy = -300;
      }
    });
	
  },
  
	takeDamage: function(dmg, shooter) {
		this.p.currentHealth -= dmg;
		if (this.p.currentHealth <= 0) {
			Q.state.trigger("enemyDied", shooter);
			this.destroy();
		}
	},
  
	step: function(dt) {
		// Randomly change elements
		if (Math.random() > 0.5) {
			this.p.element = ELEBALL_ELEMENT_WATER;
		} else {
			this.p.element = ELEBALL_ELEMENT_FIRE;
		}
		// Make enemies shoot randomly
		if (this.p.shootRandomly) {
			this.p.cooldown -= dt;
			if (this.p.cooldown <= 0) {
				this.p.cooldown = 0;
			}
			
			if (this.p.cooldown <= 0) {
				//ready to shoot
				
				var enemyEleball = new Q.EnemyEleball({
					element : this.p.element,
					sheet : ELEBALL_ELEMENTNAMES[this.p.element],
					soundIsAnnoying : true
				});
				enemyEleball.p.x = this.p.x - this.p.w/10 - enemyEleball.p.w/2;
				enemyEleball.p.y = this.p.y;
				
				//randomly choose a direction to shoot
				if (Math.random() > 0.5) {
					enemyEleball.p.vx = ELEBALL_DEFAULT_VX;
				} else {
					enemyEleball.p.vx = -ELEBALL_DEFAULT_VX;
				}
				
				Q.stage().insert(enemyEleball);
				
				// randomly set a cooldown between 2.0 and 5.0
				this.p.cooldown = Math.random() * 3 + ENEMY_DEFAULT_COOLDOWN; }
		}
	},
	
	draw: function(ctx) {
		this._super(ctx);
		this.healthBar.draw(ctx);
	}
});

// ## level1 scene
// Create a new scene called level 1
Q.scene("level1",function(stage) {

  // Add in a repeater for a little parallax action
  stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({
                             dataAsset: 'level1.json',
                             sheet:     'tiles' }));


  // Create the player and add them to the stage
  var player = stage.insert(new Q.Player({name: "saihou"}));

  // Give the stage a moveable viewport and tell it
  // to follow the player.
  stage.add("viewport").follow(player);

  // Add in a couple of enemies
  stage.insert(new Q.Enemy({ x: 700, y: 0 }));
  stage.insert(new Q.Enemy({ x: 800, y: 0 }));

  // Finally add in the tower goal
  stage.insert(new Q.Tower({ x: 180, y: 50 }));
});

// ## Level2 scene
// Create a new scene called level 2
Q.scene("level2",function(stage) {

  // Add in a repeater for a little parallax action
  stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({
                             dataAsset: 'level2.json',
                             sheet:     'tiles' }));


  // Create the player and add them to the stage
  var player = stage.insert(new Q.Player());

  // Give the stage a moveable viewport and tell it
  // to follow the player.
  stage.add("viewport").follow(player);

  // Add in a couple of enemies
  stage.insert(new Q.Enemy({ x: 700, y: 0 }));
  stage.insert(new Q.Enemy({ x: 800, y: 0 }));

  // Finally add in the tower goal
  stage.insert(new Q.Tower({ x: 180, y: 50 }));
});

// To display a game over / game won popup box, 
// create a endGame scene that takes in a `label` option
// to control the displayed message.
Q.scene('endGame',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
  }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                  label: "Play Again" }))         
  var label = container.insert(new Q.UI.Text({x:10, y: -10 - button.p.h, 
                                                   label: stage.options.label }));
  // When the button is clicked, clear all the stages
  // and restart the game.
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene('level2');
  });

  // Expand the container to visibily fit it's contents
  // (with a padding of 20 pixels)
  container.fit(20);
});

// ## Asset Loading and Game Launch
// Q.load can be called at any time to load additional assets
// assets that are already loaded will be skipped
// The callback will be triggered when everything is loaded
Q.load("npcs.png, npcs.json, level1.json, level2.json, tiles.png, background-wall.png,\
	eleball.png, eleball.json, \
    characters.png, characters.json", function() {
  // Sprites sheets can be created manually
  Q.sheet("tiles","tiles.png", { tilew: 32, tileh: 32 });
  // Or from a .json asset that defines sprite locations
  Q.compileSheets("characters.png", "characters.json");
  //Q.compileSheets("elemental_balls.png", "elemental_balls.json");
  Q.compileSheets("npcs.png", "npcs.json");
    Q.compileSheets("eleball.png", "eleball.json");   

  
  // Finally, call stageScene to run the game
  Q.stageScene("level1");
});

Q.animations('character_' + PLAYER_NAME, {
	run_right: { frames: [8,9,10,11], rate: 1/6}, 
	run_left: { frames: [4,5,6,7], rate:1/6 },
	run_right_still: { frames: [9], rate: 1/6}, 
	run_left_still: { frames: [5], rate:1/6 },
	run_out: { frames: [0,1,2,3], rate: 1/6}, 
	run_in: { frames: [12,13,14,15], rate:1/6 },
	stand_right: { frames: [8], rate: 1/3 },
	stand_left: { frames: [4], rate: 1/3 },
	stand_front: { frames: [0], rate: 1/3 },
	stand_back: { frames: [12], rate: 1/3 },
});

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify level.json to change the level around and add in some more enemies.
// 2. Add in a second level by creating a level2.json and a level2 scene that gets
//    loaded after level 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.

});
