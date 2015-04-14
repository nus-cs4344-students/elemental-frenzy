"use strict";

// ## Actor constants
var ACTOR_FIRE = 0;
var ACTOR_EARTH = 1;
var ACTOR_LIGHTNING = 2;
var ACTOR_WATER = 3;
var ACTOR_CHARACTERS = ["character_fire", "character_earth" , "character_lightning", "character_water"];
var ACTOR_DEFAULT_ELEMENT = 0; // fire
var ACTOR_DEFAULT_MAXHEALTH = 50;
// ## Animation
var ACTOR_ANIMATION = 'actor';
var ACTOR_NO_FIRE_ANIMATION = "no_fire";
var ACTOR_FIRE_ANIMATION_TIME = 0.5; // seconds (NOT MILLISECONDS)
var ACTOR_STAND_ANIMATION_TIME = 0.5;
var ACTOR_TAKEDAMAGE_ANIMATION_TIME = 0.5;
var ACTOR_RUN_STILL_ANIMATION_TIME = 0.5;
var ACTOR_RUN_ANIMATION_TIME = 0.5;

var ACTOR_NO_FIRE_ANIMATION = "no_fire";
var ACTOR_DEFAULT_TAKE_DAMAGE_COOLDOWN = 0.5;

// ## Actor Sprite (other players)
Q.Sprite.extend("Actor", {
  
  init: function(p, defaultP) {
    
    p = Q._defaults(p, defaultP);
    
    this._super(p, {
      sheet: ACTOR_CHARACTERS[ACTOR_DEFAULT_ELEMENT],
      sprite: ACTOR_ANIMATION,
      maxHealth: ACTOR_DEFAULT_MAXHEALTH,
      type: Q.SPRITE_ACTIVE,
      collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_ACTIVE,
      takeDamageCooldown: 0,
      update: true
    });
    
    this.add('healthBar, nameBar, dmgDisplay, healDisplay, animation, 2d, powerupable, 2dLadder');
    
    this.on("takeDamage");

    var that = this;
    var selfDestruct = setInterval(function() {
      //console.log("ACTOR id " + that.p.spriteId + " update " + that.p.update);
      if (!that || !that.p) {
        clearInterval(selfDestruct);
        return;
      }
      if (!that.p.update) {
        clearInterval(selfDestruct);
        removeSprite(that.p.entityType, that.p.spriteId);
      }
      that.p.update = false;
    }, 3000);
  },
  
  takeDamage: function(dmgAndShooter) {
    if(this.p.takeDamageCooldown > 0){
      return;
    }

    var that = this;
    if(this.takeDamageIntervalId == -1){
        var playTakeDamage = function (){
          that.play("take_damage", 3);
        }
        this.takeDamageIntervalId = setInterval(playTakeDamage, 150);
    }
    this.p.takeDamageCooldown = ACTOR_DEFAULT_TAKE_DAMAGE_COOLDOWN;
  },
  
  die: function(killerEntityType, killerId) {

    var killerName = getSprite(killerEntityType, killerId).p.name;    

    console.log(this.p.name + " died to " + killerName);

    var msg;
    if(killerId == selfId){
      msg = "You have killed "+this.p.name;
    }else{
      msg = killerName+" has killed "+this.p.name;
    }
    
    Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg});

    removeActorSprite(this.p.spriteId);
  },

  step: function(dt) {
     // stop interval when player can take damage
    if(this.p.takeDamageCooldown <= 0 && this.takeDamageIntervalId != -1){
      clearInterval(this.takeDamageIntervalId);
      this.takeDamageIntervalId = -1;
    }

    if(this.p.onLadder) {
      this.p.gravity = 0;

      if(Q.inputs['up']) {
        this.play("run_in");
      } else if(Q.inputs['down']) {
        this.play("run_in");
      } else{
        this.play("stand_back");
      }
    }else{
      this.p.gravity = 1;
    }

    if(!this.p.onLadder && this.has('animation')){

      if(this.p.fireAnimation != ACTOR_NO_FIRE_ANIMATION &&
        typeof this.p.fireAnimation != 'undefined'){
        this.play(this.p.fireAnimation, 1);
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
        } else {
          this.play("stand_front");
        }
      }
    }
  },
  
  draw: function(ctx) {
    this._super(ctx);
  }
});

Q.animations(ACTOR_ANIMATION, {
  run_in: { frames: [7,8,9,10,11,12], rate: ACTOR_RUN_ANIMATION_TIME/6}, 
  run_left: { frames: [20,21,22,23,24,25], rate:ACTOR_RUN_ANIMATION_TIME/6 },
  run_out: { frames: [33,34,35,36,37,38], rate:ACTOR_RUN_ANIMATION_TIME/6 },
  run_right: { frames: [46,47,48,49,50,51], rate: ACTOR_RUN_ANIMATION_TIME/6}, 
  
  run_left_still: { frames: [22], rate: ACTOR_RUN_STILL_ANIMATION_TIME/3 },
  run_right_still: { frames: [47], rate: ACTOR_RUN_STILL_ANIMATION_TIME/3}, 

  fire_up: { frames: [51,52,53,54,55,56,57,58,59,60,61,62,63], rate: ACTOR_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false},
  fire_left: { frames: [64,65,66,67,68,69,70,71,72,73,74,75,76], rate: ACTOR_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 
  fire_down: { frames: [77,78,79,80,81,82,83,84,85,86,87,88,89], rate: ACTOR_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 
  fire_right: { frames: [90,91,92,93,94,95,96,97,98,99,100,101,102,103], rate: ACTOR_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 

  take_damage: {frames: [104], rate: ACTOR_TAKEDAMAGE_ANIMATION_TIME/3, loop:false},

  stand_back: { frames: [7], rate: ACTOR_STAND_ANIMATION_TIME/3 },
  stand_left: { frames: [20], rate: ACTOR_STAND_ANIMATION_TIME/3 },
  stand_front: { frames: [33], rate: ACTOR_STAND_ANIMATION_TIME/3 },
  stand_right: { frames: [46], rate: ACTOR_STAND_ANIMATION_TIME/3 }
});