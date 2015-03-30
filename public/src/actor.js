"use strict";

// ## Actor constants
var ACTOR_FIRE = 0;
var ACTOR_EARTH = 1;
var ACTOR_LIGHTNING = 2;
var ACTOR_WATER = 3;
var ACTOR_CHARACTERS = ["character_fire", "character_earth" , "character_lightning", "character_water"];
var ACTOR_DEFAULT_ELEMENT = 0; // fire
var ACTOR_ANIMATION = 'actor';
var ACTOR_NO_FIRE_ANIMATION = "no_fire";
var ACTOR_DEFAULT_TAKE_DAMAGE_COOLDOWN = 0.5;

// ## Actor Sprite (other players)
Q.Sprite.extend("Actor", {
  
  init: function(p, defaultP) {
    
    require(['src/helper-functions'], function() {
      p = mergeObjects(p, defaultP);
    });
    
    this._super(p, {
      sheet: ACTOR_CHARACTERS[ACTOR_DEFAULT_ELEMENT],
      sprite: ACTOR_ANIMATION,
      maxHealth: PLAYER_DEFAULT_MAXHEALTH,
      type: Q.SPRITE_ACTIVE,
      takeDamageCooldown: 0,
      update: true
    });
    
    this.add('healthBar, nameBar, dmgDisplay, animation');
    
    this.on("takeDamage");

    var that = this;
    var selfDestruct = setInterval(function() {
      //console.log("ACTOR id " + that.p.spriteId + " update " + that.p.update);
      
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

    var dmg = dmgAndShooter.dmg,
        shooterEntityType = dmgAndShooter.shooter.entityType,
        shooterId = dmgAndShooter.shooter.spriteId;
    this.p.currentHealth -= dmg;
    console.log("Actor took damage "+ dmg +" from " + shooterEntityType + " " + shooterId + ". currentHealth = " + this.p.currentHealth);
    
    if (this.p.isServerSide && // Player's death will be decided on the server
        this.p.currentHealth <= 0) {
      this.die(shooterEntityType, shooterId);
    }

    this.p.takeDamageCooldown = ACTOR_DEFAULT_TAKE_DAMAGE_COOLDOWN;
  },
  
  die: function(killerEntityType, killerId) {
    var killerName = getSprite(killerEntityType, killerId).p.name;

    console.log(this.p.name + " died to " + killerName);
  
    Q.state.trigger("playerDied", {
      victim: {entityType: this.p.entityType, spriteId: this.p.spriteId}, 
      killer: {entityType: killerEntityType, spriteId: killerId}
    });
    
    removeActorSprite(this.p.spriteId);
  },

  step: function(dt) {
    if(this.has('animation')){

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
  run_in: { frames: [7,8,9,10,11,12], rate: 1/6}, 
  run_left: { frames: [20,21,22,23,24,25], rate:1/6 },
  run_out: { frames: [33,34,35,36,37,38], rate:1/6 },
  run_right: { frames: [46,47,48,49,50,51], rate: 1/6}, 
  
  run_left_still: { frames: [22], rate:1/3 },
  run_right_still: { frames: [47], rate: 1/3}, 

  fire_up: { frames: [51,52,53,54,55,56,57,58,59,60,61,62,63], rate: 1/13, trigger: "fired", loop: false},
  fire_left: { frames: [64,65,66,67,68,69,70,71,72,73,74,75,76], rate: 1/13, trigger: "fired", loop: false}, 
  fire_down: { frames: [77,78,79,80,81,82,83,84,85,86,87,88,89], rate: 1/13, trigger: "fired", loop: false}, 
  fire_right: { frames: [90,91,92,93,94,95,96,97,98,99,100,101,102,103], rate: 1/13, trigger: "fired", loop: false}, 

  stand_back: { frames: [7], rate: 1/3 },
  stand_left: { frames: [20], rate: 1/3 },
  stand_front: { frames: [33], rate: 1/3 },
  stand_right: { frames: [46], rate: 1/3 }
});