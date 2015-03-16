"use strict";

require(['src/helper-functions']);

// ## Player constants
var PLAYER_FIRE = 0;
var PLAYER_EARTH = 1;
var PLAYER_LIGHTNING = 2;
var PLAYER_WATER = 3;
var PLAYER_CHARACTERS = ["character_fire", "character_earth" , "character_lightning", "character_water"];
var PLAYER_DEFAULT_MAXHEALTH = 50;
var PLAYER_DEFAULT_COOLDOWN = 0.3;
var PLAYER_DEFAULT_DMG = 2;
var PLAYER_DEFAULT_ELEMENT = 0; // fire
var PLAYER_ANIMATION = "character";
var PLAYER_NO_FIRE_ANIMATION = "no_fire";

// ## Player Sprite
// The very basic player sprite, this is just a normal sprite
// using the player sprite sheet with default controls added to it.
Q.Sprite.extend("Player",{

  // the init constructor is called on creation
  init: function(p, defaultP) {

		require(['src/helper-functions'], function() {
			p = mergeObjects(p, defaultP);
		});

		// You can call the parent's constructor with this._super(..)
		this._super(p, {
			sheet: PLAYER_CHARACTERS[PLAYER_DEFAULT_ELEMENT],  // Setting a sprite sheet sets sprite width and height
		  sprite: PLAYER_ANIMATION,
		    x: 410,           // You can also set additional properties that can
		    y: 90,             // be overridden on object creation
		  cooldown: 0,		// can fire immediately
		  canFire: true,
		  maxHealth: PLAYER_DEFAULT_MAXHEALTH,
		  currentHealth: PLAYER_DEFAULT_MAXHEALTH,
		  name: "no_name",
		  dmg: PLAYER_DEFAULT_DMG,
		  type: Q.SPRITE_ACTIVE,
		  element: PLAYER_DEFAULT_ELEMENT,
		  fireAnimation: PLAYER_NO_FIRE_ANIMATION,
		  fireTargetX: 0, // position x of target in game world
		  fireTargetY: 0,  // possition y of target in game world
		  isFiring: false,
		  onLadder: false,
		  ladderX: 0
		});

    // Add in pre-made components to get up and running quickly
    // The `2d` component adds in default 2d collision detection
    // and kinetics (velocity, gravity)
    // The `platformerControls` makes the player controllable by the
    // default input actions (left, right to move,  up or action to jump)
    // It also checks to make sure the player is on a horizontal surface before
    // letting them jump.
    this.add('2d, platformerControls, animation, healthBar, nameBar, dmgDisplay, 2dLadder');
	
		this.addEventListeners();

		// Add to the game state!
		// Kills = Deaths = 0
		if (typeof Q.state.p.kills[this.p.name] === 'undefined') {
			Q.state.p.kills[this.p.name] = Q.state.p.deaths[this.p.name] = 0;
		}
  },
  
  addEventListeners: function() {
	  var that = this;
		
		// Write event handlers to respond hook into behaviors.
		// hit.sprite is called everytime the player collides with a sprite
		this.on("hit.sprite",function(collision) {
		  // Check the collision, if it's the Tower, you win!
		  if(collision.obj.isA("Tower")) {
			Q.stageScene("endGame",1, { label: "You Won!" }); 
			this.destroy();
		  }
		});
		
		this.on('takeDamage');
		
		// Event listener for toggling elements
		Q.input.on("toggleNextElement", function() {
			that.p.element = (that.p.element + 1) % ELEBALL_ELEMENTNAMES.length;
		});					

		Q.el.addEventListener('mouseup', function(e){
			that.trigger('fire', e);
		});

		this.on('fire', this, 'fire');
		this.on('fired', this, 'fired');
		this.on("onLadder", this, 'climbLadder');	
  },

  fire: function(e){
		if (this.p.cooldown > 0 || !this.p.canFire) {
			return;
		}

		var stage = Q.stage(0); 
		var touch = e.changedTouches ?  e.changedTouches[0] : e;
		var mouseX = Q.canvasToStageX(touch.x, stage);
		var mouseY = Q.canvasToStageY(touch.y, stage);
		this.p.fireTargetX = mouseX;
		this.p.fireTargetY = mouseY;

		// compute firing angle for animation
		var angleRad = Math.atan2(mouseY - this.p.y, mouseX - this.p.x) ;
		var angleDeg = -angleRad * 180 / Math.PI;

		if(angleDeg>0){
			angleDeg = 360 - angleDeg;
		}else{
			angleDeg = -angleDeg;
		}

		var animationName = "";
		if((angleDeg >=0 && angleDeg <=45) || (angleDeg <=360 && angleDeg>=315)){
			// shooting angle right
			animationName = "fire_right";
		}else if(angleDeg > 45 && angleDeg <= 135){
			// shooting angle down
			animationName = "fire_down";
		}else if(angleDeg > 135 && angleDeg <= 225){
			// shooting angle left
			animationName = "fire_left";
		}else{
			// shooting angle up
			animationName = "fire_up";
		}

		this.p.fireAnimation = animationName;

		if(this.has('animation')){
			this.play(animationName, 1);
		}else{
			this.trigger('fired');
		}

		// Magic code
		e.preventDefault();
  },

  fired: function(){
  	// reset fire animation
  	this.p.fireAnimation = PLAYER_NO_FIRE_ANIMATION;

  	// re-compute firing angle with respect to current player position and target position
  	var angleRad = Math.atan2(this.p.fireTargetY - this.p.y, this.p.fireTargetX - this.p.x) ;
		var angleDeg = -angleRad * 180 / Math.PI;

		if(angleDeg>0){
			angleDeg = 360 - angleDeg;
		}else{
			angleDeg = -angleDeg;
		}

		var eleball = new Q.PlayerEleball({
			element : this.p.element,
			sheet : ELEBALL_ELEMENTNAMES[this.p.element],
			shooter : this.p.name,
			shooterId : this.p.playerId,
			frame : ELEBALL_FRAME,
			angle : angleDeg, // angle 0 starts from 3 o'clock then clockwise
			vx : ELEBALL_DEFAULT_VX * Math.cos(angleRad),
			vy : ELEBALL_DEFAULT_VY * Math.sin(angleRad)
		});

		// fire ball location offset from player
		var ballToPlayerY = Math.abs((this.p.h/2 + eleball.p.h/2) * Math.sin(angleRad)) * ELEBALL_PLAYER_SF;
		if(angleDeg <= 360 && angleDeg > 180){
			// deduct ball width due to the direction of the ball is set to be default at right direction
			eleball.p.y = this.p.y - ballToPlayerY;
		} else {
			eleball.p.y = this.p.y + ballToPlayerY;
		}

		var ballToPlayerX = Math.abs((this.p.w/2 + eleball.p.w/2) * Math.cos(angleRad)) * ELEBALL_PLAYER_SF;
		if(angleDeg <= 270 && angleDeg > 90){
			eleball.p.x = this.p.x - ballToPlayerX;
		} else {
			eleball.p.x = this.p.x + ballToPlayerX;
		}
		
		Q.stage().insert(eleball);
		socket.emit('insert_object', {
			playerId: this.p.playerId,
			object_type: 'PlayerEleball',
			object_properties: eleball.p
		});
		
		this.p.cooldown = PLAYER_DEFAULT_COOLDOWN;
  },

  takeDamage: function(dmgAndShooter) {
    var dmg = dmgAndShooter.dmg,
		shooter = dmgAndShooter.shooter;
		this.p.currentHealth -= dmg;
		console.log("Took damage by " + shooter + ". currentHealth = " + this.p.currentHealth);
		
		socket.emit('playerTookDmg', {
			playerId: this.p.playerId,
			dmg: dmg
		});

		if (this.p.currentHealth <= 0) {
			this.die(shooter);
		}  
  },
  
  die: function(killer) {
		this.p.canFire = false;
		Q.stageScene("endGame",1, { label: "You Died" });

		console.log(this.p.name + " died to " + killer);
	
		Q.state.trigger("playerDied", {victim: this.p.name, killer: killer});
	
		socket.emit('playerDied', {
			playerId: this.p.playerId
		});
		this.destroy();  
  },
  
  climbLadder: function(col){
			if(col.obj.isA("Ladder")) { 
	      this.p.onLadder = true;
	      this.p.ladderX = col.obj.p.x;
	    }
	},

  step: function(dt) {	  
	  this.p.cooldown -= dt;
	  if (this.p.cooldown <= 0) {
			this.p.cooldown = 0;
	  }

	  var processed = false;
	  if(this.p.onLadder) {
      this.p.gravity = 0;

      if(Q.inputs['up']) {
        this.p.vy = -this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("run_in");
      } else if(Q.inputs['down']) {
        this.p.vy = this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("run_in");
      } else{
      	this.p.vy = 0;
        this.play("stand_back");
      }
      processed = true;
    }

    if(!processed && this.has('animation')){
    	this.p.gravity = 1;
    	
			// player not jumping
			if(this.p.vy == 0){
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
	  }
	  
	  socket.emit('update', {
			playerId: this.p.playerId,
			p: this.p
	  });

	  this.p.onLadder = false;
  },
  
  draw: function(ctx) {
	  this._super(ctx);
  }

});

Q.animations(PLAYER_ANIMATION, {
	run_in: { frames: [7,8,9,10,11,12], rate: 1/6}, 
	run_left: { frames: [20,21,22,23,24,25], rate:1/6 },
	run_out: { frames: [33,34,35,36,37,38], rate:1/6 },
	run_right: { frames: [46,47,48,49,50,51], rate: 1/6}, 
	
	run_left_still: { frames: [22], rate:1/3 },
	run_right_still: { frames: [47], rate: 1/3}, 

	fire_up: { frames: [51,52,53,54,55,56,57,58,59,60,61,62,63], rate: 1/13, trigger: "fired", loop: false},
	fire_left: { frames: [64,65,66,67,68,69,70,71,72,73,74,75,76], rate: 1/13, trigger: "fired", loop: false}, 
	fire_down: { frames: [77,78,79,80,81,82,83,84,85,86,87,88,89], rate: 1/13, trigger: "fired", loop: false}, 
	fire_right: { frames: [90,91,92,93,94,95,96,97,98,99,100,101,102,103,103], rate: 1/13, trigger: "fired", loop: false}, 

	stand_back: { frames: [7], rate: 1/3 },
	stand_left: { frames: [20], rate: 1/3 },
	stand_front: { frames: [33], rate: 1/3 },
	stand_right: { frames: [46], rate: 1/3 }
});