"use strict";

/**
 * When adding a new Powerup, include:
 * 1. the name of the powerup,
 * 2. the spritesheet for the powerup to use,
 * 3. the powerup's name, spritesheet, and duration into the powerupSystem's 'powerups' variable
 * 4. (implement) the effects of a powerup (using the powerup name) in the 'powerupable' component and the recalculateStats function
 */
 
var POWERUP_COLLISIONTYPE = 64;

var POWERUP_CLASS_ATTACK_DOUBLEDMG            = "PowerupDoubleDmg";
var POWERUP_CLASS_MANA_ZEROMANACOST           = "PowerupZeroManaCost";
var POWERUP_CLASS_MOVESPEED_150SPEED       = "PowerupDoubleMoveSpeed";
var POWERUP_CLASS_HEALTH_HEALTOFULL           = "PowerupHealToFull";

var POWERUP_SPRITESHEET_ATTACK_DOUBLEDMG      = 'powerup_attack';
var POWERUP_SPRITESHEET_MANA_ZEROMANACOST     = 'powerup_mana';
var POWERUP_SPRITESHEET_MOVESPEED_150SPEED = 'powerup_movement';
var POWERUP_SPRITESHEET_HEALTH_HEALTOFULL     = 'powerup_red';

var POWERUP_DURATION_ATTACK_DOUBLEDMG    = 10.0;
var POWERUP_DURATION_HEALTH_HEALTOFULL   = 0.0;
var POWERUP_DURATION_MANA_ZEROMANACOST   = 10.0;
var POWERUP_DURATION_MOVESPEED_150SPEED = 10.0;

var POWERUP_DEFAULT_BOUNCEAMOUNT = 15; // for powerups to bounce up and down

// ## 2d powerup to be attached to powerups
// gravity turns off once it collides with something
Q.component('2dPowerup', {
  added: function() {
    var entity = this.entity;
    Q._defaults(entity.p,{
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      gravity: 1, 
      type: Q.SPRITE_PARTICLE, 
      collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_PARTICLE,          // don't collide with itself and with particles (eleballs)
      constantY: entity.p.y - POWERUP_DEFAULT_BOUNCEAMOUNT,     // start the powerup bouncing from above (so that it doesnt go into a tile)
      t: Math.PI/2 + Math.PI/4,                                 // t = time-axis
      bounceAmount: POWERUP_DEFAULT_BOUNCEAMOUNT                // bounce amplitude (up-down )
    });
    entity.on('step',this,"step");
    entity.on('hit',this,"collision");
  },

  // Eleballs get destroyed when touching things, and may play a sound if soundIsAnnoying is set to false
  // Eleballs may also cancel out fireballs
  // Eleball elements and their indices:
  // [0: fire, 1: earth, 2: lightning, 3: water]
  // Logic for eleball collision:
  //  - Case 1: Both gets destroyed if their elements are the same
  //  - Case 2: this element of index i destroys the other element of index j
  //        and continues on its path if (j-i) == 1 or (i-j) == (numElements-1)
  //  - Case 3: Both elements pass through each other if |i-j| == 2
  collision: function(col,last) {    
    var entity = this.entity;
    // Powerups only care about player collisions who are powerupable
    if ( (col.obj.isA('Player') || col.obj.isA('Actor')) && col.obj.has('powerupable')) {
      //console.log("Powerup colliding with player " + col.obj.p.name + "(" + col.obj.p.spriteId + ")");
      entity.givePlayerEffect(col.obj);
      entity.destroy();
    } else if ( !col.obj.isA('Player') && !col.obj.isA('Actor') && !col.obj.has('2dEleball') ) {
      // turn off gravity, shift it up
      entity.p.gravity = 0;
      entity.p.vx = entity.p.ax = 0;
      entity.p.vy = entity.p.ay = 0;
      entity.p.y -= col.separate[1];
      entity.p.constantY = entity.p.y- entity.p.bounceAmount;
      //console.log("separate[1]: " + col.separate[1] + " bounceAmount: " + entity.p.bounceAmount);
    }
  },

  step: function(dt) {
    var p = this.entity.p,
    dtStep = dt,
    entity = this.entity;
    
    while(dtStep > 0) {
      dt = Math.min(1/30,dtStep);
      // Updated based on the velocity and acceleration
      p.vx += p.ax * dt + (p.gravityX === void 0 ? Q.gravityX : p.gravityX) * dt * p.gravity;
      p.vy += p.ay * dt + (p.gravityY === void 0 ? Q.gravityY : p.gravityY) * dt * p.gravity;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      this.entity.stage.collide(this.entity, {maxCol: 1});
      dtStep -= dt;
    }
    
    if (p.gravity == 0) {
      // Move it up and down in a sine-wave-like fashion
      entity.p.t += dt;
      entity.p.t %= Math.PI;
      entity.p.y = entity.p.constantY + Math.sin(entity.p.t) * entity.p.bounceAmount;
    }
  }
});

// ## Power up sprite
// Power up for players to increase damage, recover HP / MP
Q.Sprite.extend("Powerup", {
  init: function(p, defaultP) {
    p = Q._defaults(p, defaultP);
    this._super(p, { 
      name: 'powerup_nameless',
      sheet: 'powerup_sheetless',
      spriteId: -1,
      duration: 10.0,
      entityType: 'POWERUP',
      type: Q.SPRITE_PARTICLE,
      collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_PARTICLE,
      sensor: true, // so that it doesn't bounce players off
      x: 700,
      y: 100
    });
    
    console.log(this.p.name + " created at (" + this.p.x + "," + this.p.y + ")");
    
    this.add('2dPowerup');
  },
  
  // Give player the effect of the powerup and then disappear
  givePlayerEffect: function(player) {
    console.log("Powerup " + this.p.name + " giving effect to player " + player.p.name + "(" + player.p.spriteId + ")");
    player.addPowerup(this.p.name, this.p.duration);
  }
});

// ## General powerup system 
// ## The powerup system should:
// 1. be a component to add to the stage
// 2. contain all powerups of the game
// 3. have a function spawnPowerup(powerupName, coordX, coordY)
Q.component('powerupSystem', {
  added: function() {
    // All the powerups of the game
    this.powerups = {
      POWERUP_CLASS_ATTACK_DOUBLEDMG:      {sheet: POWERUP_SPRITESHEET_ATTACK_DOUBLEDMG,          duration: POWERUP_DURATION_ATTACK_DOUBLEDMG},
      POWERUP_CLASS_HEALTH_HEALTOFULL:     {sheet: POWERUP_SPRITESHEET_HEALTH_HEALTOFULL,         duration: POWERUP_DURATION_HEALTH_HEALTOFULL},
      POWERUP_CLASS_MANA_ZEROMANACOST:     {sheet: POWERUP_SPRITESHEET_MANA_ZEROMANACOST,         duration: POWERUP_DURATION_MANA_ZEROMANACOST},
      POWERUP_CLASS_MOVESPEED_150SPEED: {sheet: POWERUP_SPRITESHEET_MOVESPEED_150SPEED,      duration: POWERUP_DURATION_MOVESPEED_150SPEED}
    }
  },
  
  // Instantiates the powerup
  createPowerup: function(powerupName, x, y) {
    if (this.powerups[powerupName]) {
      return new Q.Powerup({
        name: powerupName, 
        sheet: this.powerups[powerupName].sheet, 
        duration: this.powerups[powerupName].duration,
        x: x, 
        y: y
      });
    } else {
      console.log("Error in createPowerup(): powerupName " + powerupName + " is not recognized!");
    }
  },
  
  extend: {
    // Spawns a powerup 'powerupName' at the coordinates (x, y)
    spawnPowerup: function(powerupName, x, y) {
      var powerupSystem = this.powerupSystem;
      if ( !powerupSystem.powerups[powerupName]) {
        console.log("Error in spawnPowerup(): there is no powerup called " + powerupName);
        return;
      }
      this.insert(powerupSystem.createPowerup(powerupName, x, y));
    }
  }
});

// ## Powerupable component that is required for players to be power-upped
Q.component('powerupable', {
  added: function() {
    var entity = this.entity;
    entity.p.powerupsHeld = {};
    entity.p.powerupsTimeLeft = {};
    
    // Multipliers/adders for different player stats
    this.dmgAdder                 = 0;
    this.dmgMultiplier            = 1.0;
    this.manaPerShotAdder         = 0;
    this.manaPerShotMultiplier    = 1.0;
    this.manaPerShotIsZero        = false;
    this.movespeedAdder           = 0;
    this.movespeedMultiplier      = 1.0;
    
    // Default damages to recalculate the player's stats with
    this.playerDefaultDmg         = entity.p.dmg;
    this.playerDefaultManaPerShot = entity.p.manaPerShot;
    this.playerDefaultMovespeed   = entity.p.speed;
    
    entity.on('step', this, 'step');
  },
  
  // Implement logic of each powerup
  step: function(dt) {
    var entity = this.entity;
    var powerupsHeld = entity.p.powerupsHeld;
    var powerupsTimeLeft = entity.p.powerupsTimeLeft;
    
    // Reduce the time left for each powerup held,
    // and remove them once the timeleft reaches 0
    var somePowerupTimedOut = false;
    for (var powerupName in powerupsHeld) {
      if (powerupsHeld[powerupName]) {
        powerupsTimeLeft[powerupName] -= dt;
        //console.log(powerupName + " timeleft: " + powerupsTimeLeft[powerupName]);
        if (powerupsTimeLeft[powerupName] <= 0.0) {
          powerupsHeld[powerupName] = false;
          powerupsTimeLeft[powerupName] = 0.0;
          somePowerupTimedOut = true;
          
          // Revert the adder/multiplier/isZero flags for recalculation of stats
          this.expirePowerup(powerupName);
        }
      }
    }
    
    // Recalculate stats when some powerup times out
    if (somePowerupTimedOut) {
      this.entity.recalculateStats();
    }
  },
 
  applyPowerup: function(powerupName) {
    var entity = this.entity;
    switch (powerupName) {
      case POWERUP_CLASS_ATTACK_DOUBLEDMG       : this.dmgMultiplier          += 1.0; 
        break;
      case POWERUP_CLASS_MANA_ZEROMANACOST      : this.manaPerShotIsZero      = true; 
        break;
      case POWERUP_CLASS_MOVESPEED_150SPEED  : this.movespeedMultiplier    += 0.5; 
        break;
      case POWERUP_CLASS_HEALTH_HEALTOFULL      : entity.p.currentHealth      = entity.p.maxHealth; 
        break;
      default: console.log("Error in addPowerup: powerupName " + powerupName + " is not recognized!"); 
        break;
    }
  },
  
  expirePowerup: function(powerupName) {
    var entity = this.entity;
    switch (powerupName) {
      case POWERUP_CLASS_ATTACK_DOUBLEDMG       : this.dmgMultiplier          -= 1.0; 
        break;
      case POWERUP_CLASS_MANA_ZEROMANACOST      : this.manaPerShotIsZero      = false; 
        break;
      case POWERUP_CLASS_MOVESPEED_150SPEED  : this.movespeedMultiplier    -= 0.5; 
        break;
      case POWERUP_CLASS_HEALTH_HEALTOFULL      : // do nothing
        break;
      default: console.log("Error in addPowerup: powerupName " + powerupName + " is not recognized!"); 
        break;
    }
  },
  
  extend: {
    addPowerup: function(powerupName, powerupDuration) {
      this.p.powerupsTimeLeft[powerupName] = powerupDuration;
      if ( !this.p.powerupsHeld[powerupName]) {
        this.p.powerupsHeld[powerupName] = true;
        this.powerupable.applyPowerup(powerupName);
      }
      
      this.recalculateStats();
    },
    
    // Recalculates stats
    recalculateStats: function() {
      // Get default values to calculate from
      var playerDefaultDmg          = this.powerupable.playerDefaultDmg;
      var playerDefaultManaPerShot  = this.powerupable.playerDefaultManaPerShot;
      var playerDefaultMovespeed    = this.powerupable.playerDefaultMovespeed;
      
      // Get the adders and multipliers and zero flags
      var dmgAdder              = this.powerupable.dmgAdder;
      var dmgMultiplier         = this.powerupable.dmgMultiplier;
      var manaPerShotAdder      = this.powerupable.manaPerShotAdder;
      var manaPerShotMultiplier = this.powerupable.manaPerShotMultiplier;
      var manaPerShotIsZero     = this.powerupable.manaPerShotIsZero;
      var movespeedAdder        = this.powerupable.movespeedAdder;
      var movespeedMultiplier   = this.powerupable.movespeedMultiplier;
      
      // Recalculate player stats
      this.p.dmg          = (playerDefaultDmg + dmgAdder) * dmgMultiplier;
      this.p.manaPerShot  = (playerDefaultManaPerShot + manaPerShotAdder) * manaPerShotMultiplier *
                            (manaPerShotIsZero ? 0 : 1);
      this.p.speed        = (playerDefaultMovespeed + movespeedAdder) * movespeedMultiplier;
    }
  }
});