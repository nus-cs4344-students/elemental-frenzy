"use strict";

/**
 * When adding a new Powerup, include:
 * 1. the name of the powerup,
 * 2. the spritesheet for the powerup to use,
 * 3. the powerup's name, spritesheet, and duration into the powerupSystem's 'powerups' variable
 * 4. (implement) the effects of a powerup (using the powerup name) in the 'powerupable' component and the recalculateStats function
 */
 
var POWERUP_DEFAULT_FEEDBACKCOLOR             = 'blue';

var POWERUP_CLASS_ATTACK_150PERCENTDMG          = "POWERUP_CLASS_ATTACK_150PERCENTDMG";
var POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST  = "POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST";
var POWERUP_CLASS_MOVESPEED_150PERCENTSPEED     = "POWERUP_CLASS_MOVESPEED_150PERCENTSPEED";
var POWERUP_CLASS_HEALTH_HEAL30PERCENT          = "POWERUP_CLASS_HEALTH_HEAL30PERCENT";
var POWERUP_CLASS_ENEMYDROP_DMGHPMP             = "POWERUP_CLASS_ENEMYDROP_DMGHPMP";

var POWERUP_SPRITESHEET_ATTACK_150PERCENTDMG          = 'powerup_attack';
var POWERUP_SPRITESHEET_MANA_REDUCE70PERCENTMANACOST  = 'powerup_mana';
var POWERUP_SPRITESHEET_MOVESPEED_150PERCENTSPEED     = 'powerup_movement';
var POWERUP_SPRITESHEET_HEALTH_HEAL30PERCENT          = 'powerup_red';
var POWERUP_SPRITESHEET_ENEMYDROP_DMGHPMP             = 'powerup_green';

var POWERUP_DURATION_ATTACK_150PERCENTDMG         = 10.0;
var POWERUP_DURATION_HEALTH_HEAL30PERCENT         = 0.0;
var POWERUP_DURATION_MANA_REDUCE70PERCENTMANACOST = 10.0;
var POWERUP_DURATION_MOVESPEED_150PERCENTSPEED    = 10.0;
var POWERUP_DURATION_ENEMYDROP_DMGHPMP            = 0.0; // infinite (permanent)

var POWERUP_FEEDBACKONTAKEN_ATTACK_150PERCENTDMG          = "Dmg 150%";
var POWERUP_FEEDBACKONTAKEN_MANA_REDUCE70PERCENTMANACOST  = "Manacost 30%";
var POWERUP_FEEDBACKONTAKEN_MOVESPEED_150PERCENTSPEED     = "Speed 150%";
var POWERUP_FEEDBACKONTAKEN_ENEMYDROP_DMGHPMP             = "Dmg+5 Hp+10 Mp+10";

var POWERUP_SOUNDONTAKEN_ATTACK_DOUBLEDMG             = "damagePowerUp.ogg";
var POWERUP_SOUNDONTAKEN_HEALTH_HEAL30PERCENT         = "healthPowerUp.ogg";
var POWERUP_SOUNDONTAKEN_MANA_REDUCE70PERCENTMANACOST = "manaPowerUp.ogg";
var POWERUP_SOUNDONTAKEN_MOVESPEED_150PERCENTSPEED    = "hastePowerUp.ogg";
var POWERUP_SOUNDONTAKEN_ENEMYDROP_DMGHPMP            = "dmghpmpup.ogg";

var POWERUP_MAXNUMATATIME_ATTACK_150PERCENTDMG          = 2;
var POWERUP_MAXNUMATATIME_HEALTH_HEAL30PERCENT          = 2;
var POWERUP_MAXNUMATATIME_MANA_REDUCE70PERCENTMANACOST  = 2;
var POWERUP_MAXNUMATATIME_MOVESPEED_150PERCENTSPEED     = 2;
var POWERUP_MAXNUMATATIME_ENEMYDROP_DMGHPMP             = 0; // only spawns from killing enemies

var POWERUP_SPAWNTIME_ATTACK_150PERCENTDMG          = 2*POWERUP_DURATION_ATTACK_150PERCENTDMG;
var POWERUP_SPAWNTIME_HEALTH_HEAL30PERCENT          = 20.0;
var POWERUP_SPAWNTIME_MANA_REDUCE70PERCENTMANACOST  = 2*POWERUP_DURATION_MANA_REDUCE70PERCENTMANACOST;
var POWERUP_SPAWNTIME_MOVESPEED_150PERCENTSPEED     = 2*POWERUP_DURATION_MOVESPEED_150PERCENTSPEED;
var POWERUP_SPAWNTIME_ENEMYDROP_DMGHPMP             = 999999999; // infinite

var POWERUP_MAXSTACKS_ENEMYDROP_DMGHPMP = 4; // only can stack 4 of these permanent boosts

var NUM_TILES_PER_POWERUP = 25;

var POWERUP_DEFAULT_BOUNCEAMOUNT = 15; // for powerups to bounce up and down

var SOUND_DANGEROUS = "warningSiren.ogg";

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
      type: Q.SPRITE_POWERUP, 
      collisionMask: Q.SPRITE_ALL 
                      ^ Q.SPRITE_PASSIVE 
                      ^ Q.SPRITE_POWERUP 
                      ^ Q.SPRITE_PARTICLE,  // collides with everything except passive things like ladders and itself and eleballs (particles)
      constantY: entity.p.y - POWERUP_DEFAULT_BOUNCEAMOUNT,               // start the powerup bouncing from above (so that it doesnt go into a tile)
      t: Math.PI/2 + Math.PI/4,                                           // t = time-axis
      bounceAmount: POWERUP_DEFAULT_BOUNCEAMOUNT,                         // bounce amplitude (up-down )
      sensor: true // so that it doesn't bounce off players
    });

    entity.on('step',this,"step");
    entity.on('hit',this,"collision");
  },
  
  collision: function(col,last) {
    var entity = this.entity;
    // Powerups only care about player collisions who are powerupable
    if ( (col.obj.isA('Player') || col.obj.isA('Actor')) && col.obj.has('powerupable')) {
      //console.log("Powerup colliding with player " + col.obj.p.name + "(" + col.obj.p.spriteId + ")");
      if (col.obj.p.isServerSide) {
        // Server side will apply the effect
        if ( !entity.p.isTaken) {
          entity.taken(col.obj);
        }
      } else {
        // Client side will only destroy the powerup
        entity.destroy();
      }
    } else if ( !col.obj.isA('Player') && !col.obj.isA('Actor') && !col.obj.isA('Enemy') && !col.obj.has('2dEleball') && !col.obj.isA('Ladder')) {
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
      entityType: 'POWERUP',
      spriteId: -1,
      isTaken: false,
      duration: 10.0,
      type: Q.SPRITE_POWERUP, 
      collisionMask: Q.SPRITE_ALL 
                      ^ Q.SPRITE_PASSIVE 
                      ^ Q.SPRITE_POWERUP 
                      ^ Q.SPRITE_PARTICLE,  // collides with everything except passive things like ladders and itself and eleballs (particles)
      sensor: true, // so that it doesn't bounce players off
      x: 700,
      y: 100
    });
    
    //console.log(this.p.name + " created at (" + this.p.x + "," + this.p.y + ")");
    this.p.z = 3;
    this.add('2dPowerup');
  },
  
  // Give player the effect of the powerup and then disappear
  givePlayerEffect: function(player) {
    //console.log("Powerup " + this.p.name + " giving effect to player " + player.p.name + "(" + player.p.spriteId + ")");
    player.addPowerup(this.p.name, this.p.duration, this.p.feedbackOnTaken, this.p.soundOnTaken);
    if (player.p.isServerSide) {
      // Tell client that powerup was taken
      Q.input.trigger('broadcastAll', {eventName: 'powerupTaken', eventData: {
          entityType: 'PLAYER', 
          spriteId: player.p.spriteId,
          powerupName: this.p.name,
          powerupDuration: this.p.duration,
          powerupFeedbackOnTaken: this.p.feedbackOnTaken,
          powerupSoundOnTaken: this.p.soundOnTaken,
          powerupId: this.p.spriteId
        }
      });
    }
  },
  
  taken: function(player) {
    if (this.p.isTaken) {
      // Can't take more than once
      return;
    }
    this.p.isTaken = true;
    this.givePlayerEffect(player);
    this.trigger('taken', this.p.name);
    this.destroy();
  }
});

// ## General powerup system 
// ## The powerup system should:
// 1. be a component to add to the stage
// 2. contain all powerups of the game
// 3. have a function spawnPowerup(powerupName, coordX, coordY)
Q.component('powerupSystem', {
  added: function() {
    var tileLayer = this.entity._collisionLayers[0];
    var numPowerup;
    if(tileLayer){
      numPowerup = Math.floor(Math.max(tileLayer.p.rows, tileLayer.p.cols) / NUM_TILES_PER_POWERUP);
    }

    // All the powerups of the game
    this.powerups = {
      POWERUP_CLASS_ATTACK_150PERCENTDMG:{name:           POWERUP_CLASS_ATTACK_150PERCENTDMG,
                                          sheet:          POWERUP_SPRITESHEET_ATTACK_150PERCENTDMG, 
                                          duration:       POWERUP_DURATION_ATTACK_150PERCENTDMG,
                                          feedbackOnTaken:POWERUP_FEEDBACKONTAKEN_ATTACK_150PERCENTDMG,
                                          soundOnTaken:   POWERUP_SOUNDONTAKEN_ATTACK_DOUBLEDMG,
                                          maxNumAtATime:  numPowerup || POWERUP_MAXNUMATATIME_ATTACK_150PERCENTDMG,
                                          spawnTime:      POWERUP_SPAWNTIME_ATTACK_150PERCENTDMG,
                                          existing:       0
                                        },
      POWERUP_CLASS_HEALTH_HEAL30PERCENT:{name:           POWERUP_CLASS_HEALTH_HEAL30PERCENT,
                                          sheet:          POWERUP_SPRITESHEET_HEALTH_HEAL30PERCENT, 
                                          duration:       POWERUP_DURATION_HEALTH_HEAL30PERCENT,
                                          soundOnTaken:   POWERUP_SOUNDONTAKEN_HEALTH_HEAL30PERCENT,
                                          maxNumAtATime:  numPowerup || POWERUP_MAXNUMATATIME_HEALTH_HEAL30PERCENT,
                                          spawnTime:      POWERUP_SPAWNTIME_HEALTH_HEAL30PERCENT,
                                          existing:       0
                                        },
      POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST:{name:   POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST,
                                          sheet:          POWERUP_SPRITESHEET_MANA_REDUCE70PERCENTMANACOST, 
                                          duration:       POWERUP_DURATION_MANA_REDUCE70PERCENTMANACOST,
                                          feedbackOnTaken:POWERUP_FEEDBACKONTAKEN_MANA_REDUCE70PERCENTMANACOST,
                                          soundOnTaken:   POWERUP_SOUNDONTAKEN_MANA_REDUCE70PERCENTMANACOST,
                                          maxNumAtATime:  numPowerup || POWERUP_MAXNUMATATIME_MANA_REDUCE70PERCENTMANACOST,
                                          spawnTime:      POWERUP_SPAWNTIME_MANA_REDUCE70PERCENTMANACOST,
                                          existing:       0
                                        },
      POWERUP_CLASS_MOVESPEED_150PERCENTSPEED:{name:      POWERUP_CLASS_MOVESPEED_150PERCENTSPEED,
                                          sheet:          POWERUP_SPRITESHEET_MOVESPEED_150PERCENTSPEED,
                                          duration:       POWERUP_DURATION_MOVESPEED_150PERCENTSPEED,
                                          feedbackOnTaken:POWERUP_FEEDBACKONTAKEN_MOVESPEED_150PERCENTSPEED,
                                          soundOnTaken:   POWERUP_SOUNDONTAKEN_MOVESPEED_150PERCENTSPEED,
                                          maxNumAtATime:  numPowerup ||  POWERUP_MAXNUMATATIME_MOVESPEED_150PERCENTSPEED,
                                          spawnTime:      POWERUP_SPAWNTIME_MOVESPEED_150PERCENTSPEED,
                                          existing:       0
                                        },
      POWERUP_CLASS_ENEMYDROP_DMGHPMP:{   name:           POWERUP_CLASS_ENEMYDROP_DMGHPMP,
                                          sheet:          POWERUP_SPRITESHEET_ENEMYDROP_DMGHPMP,
                                          duration:       POWERUP_DURATION_ENEMYDROP_DMGHPMP,
                                          feedbackOnTaken:POWERUP_FEEDBACKONTAKEN_ENEMYDROP_DMGHPMP,
                                          soundOnTaken:   POWERUP_SOUNDONTAKEN_ENEMYDROP_DMGHPMP,
                                          maxNumAtATime:  POWERUP_MAXNUMATATIME_ENEMYDROP_DMGHPMP, // only drops on enemy kill
                                          spawnTime:      POWERUP_SPAWNTIME_ENEMYDROP_DMGHPMP,
                                          existing:       0
                                        }                                  
    };
    
    this.randomlySpawnPowerupsToTheLimit();
  },
  
  // Instantiates the powerup
  createPowerup: function(powerupName, x, y) {
    if (this.powerups[powerupName]) {
      return new Q.Powerup({
        name: powerupName, 
        sheet: this.powerups[powerupName].sheet, 
        duration: this.powerups[powerupName].duration,
        feedbackOnTaken: this.powerups[powerupName].feedbackOnTaken,
        soundOnTaken: this.powerups[powerupName].soundOnTaken,
        spriteId: getNextSpriteId(),
        x: x, 
        y: y
      });
    } else {
      console.log("Error in createPowerup(): powerupName " + powerupName + " is not recognized!");
    }
  },
  
  // Randomly spawns the specified powerup above some tile,
  // keeping track of it in this.powerups
  randomlySpawnPowerup: function(powerupName) {
    // Get random spawn position
    var tileLayer = this.entity._collisionLayers[0];
    var randomCoord = tileLayer.getRandomTileCoordInGameWorldCoord(2);
    var randomX = randomCoord.x,
        randomY = randomCoord.y - tileLayer.p.tileH;
    var MARGIN = 0.1 * tileLayer.p.w; // 10% away from the left/right gameworld edges
    while (randomX <= MARGIN || randomX >= (tileLayer.p.w - MARGIN) || Q.stage(STAGE_LEVEL).locate(randomX, randomY)) {
      // near the borders or already has a sprite there
      //console.log("Avoiding spawning powerup at border x: " + randomCoord.x + " y: " + randomCoord.y);
      randomX = randomCoord.x;
      randomY = randomCoord.y - tileLayer.p.tileH;
      randomCoord = tileLayer.getRandomTileCoordInGameWorldCoord(2);
    }
        
    // Create the powerup
    var powerup = this.createPowerup(powerupName, randomX, randomY);
    powerup.p.scale = Math.min(tileLayer.p.tileW/powerup.p.w, tileLayer.p.tileH/powerup.p.h);
    // Listen in to the taken event of the powerup so that when one powerup is taken 
    powerup.on('taken', this, 'powerupTaken');
    // Insert the powerup
    this.entity.insert(powerup);
    // Keep track of the powerup
    this.powerups[powerup.p.name].existing++;
  },
  
  randomlySpawnPowerupsToTheLimit: function() {
    var powerups = this.powerups;
    for (var key in powerups) {
      var powerupObj = powerups[key];
      while (powerupObj.existing < powerupObj.maxNumAtATime) {
        this.randomlySpawnPowerup(powerupObj.name);
      }
    }
  },
  
  // Called when a powerup is taken, to check if there is a need to spawn more powerups
  powerupTaken: function(powerupName) {
    if (this.powerups[powerupName]) {
      // powerup is recognized
      var powerupObj = this.powerups[powerupName];
      powerupObj.existing--; // decrement 
      if (powerupObj.existing < powerupObj.maxNumAtATime) {
        // Need to spawn a new one!
        var that = this;
        setTimeout(function() {
          if (that && that.entity && powerupObj.existing < powerupObj.maxNumAtATime) {
            //console.log("Randomly spawning powerup " + powerupName + " because existing = " + powerupObj.existing + " but maxNum = " + powerupObj.maxNumAtATime);
            that.randomlySpawnPowerup(powerupName);
          }
        }, powerupObj.spawnTime * 1000);
      }
    } else {
      console.log("Error in powerupTaken(): " + powerupName + " is not a recognized powerup name!");
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
    this.playerDefaultMaxHealth   = entity.p.maxHealth;
    this.playerDefaultMaxMana     = entity.p.maxMana;
    
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
      case POWERUP_CLASS_ATTACK_150PERCENTDMG               : this.dmgMultiplier          += 0.5; 
        break;
      case POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST       : this.manaPerShotMultiplier  -= 0.7; 
        break;
      case POWERUP_CLASS_MOVESPEED_150PERCENTSPEED          : this.movespeedMultiplier    += 0.5; 
        break;
      case POWERUP_CLASS_HEALTH_HEAL30PERCENT               : entity.heal(0.3 * entity.p.maxHealth); 
        break;
      case POWERUP_CLASS_ENEMYDROP_DMGHPMP                  :
        // Store into the state the permanent boosts so that it sticks after death
        if (entity.p.isServerSide) {
          var numStacks = Q.state.get('playerPermanentBoosts')[entity.p.spriteId].stacks[powerupName];
          if (typeof numStacks === 'undefined') {
            numStacks = 0;
          }
          if (numStacks < POWERUP_MAXSTACKS_ENEMYDROP_DMGHPMP) {
            // Can still take more stacks
            Q.state.trigger('playerStatBoost', {powerupName: powerupName, 
                                                maxStacksAllowed: POWERUP_MAXSTACKS_ENEMYDROP_DMGHPMP, 
                                                spriteId: entity.p.spriteId,
                                                dmg: 5, maxHealth: 10, maxMana: 10});
            // Tell all players about his boost in power!
            var msg = entity.p.name + " just got more POWERFUL from the enemy's drop! Stop him!";
            var sound = SOUND_DANGEROUS;
            Q.input.trigger('broadcastAll', {eventName: 'message', eventData: {msg: msg, sound: sound}});
          } else {
            // Cannot take more stacks
            // Inform everybody
            var msg = entity.p.name + " is at MAXIMUM stacks of POWER from killing the boss! Can't take no more!";
            var sound = SOUND_DANGEROUS;
            Q.input.trigger('broadcastAll', {eventName: 'message', eventData: {msg: msg, sound: sound}});
          }
        }
        break;
      default: console.log("Error in addPowerup: powerupName " + powerupName + " is not recognized!"); 
        break;
    }
  },
  
  expirePowerup: function(powerupName) {
    var entity = this.entity;
    switch (powerupName) {
      case POWERUP_CLASS_ATTACK_150PERCENTDMG               : this.dmgMultiplier          -= 0.5; 
        break;
      case POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST       : this.manaPerShotMultiplier  += 0.7; 
        break;
      case POWERUP_CLASS_MOVESPEED_150PERCENTSPEED          : this.movespeedMultiplier    -= 0.5; 
        break;          
      case POWERUP_CLASS_HEALTH_HEAL30PERCENT               : // do nothing
        break;
      case POWERUP_CLASS_ENEMYDROP_DMGHPMP                  : // do nothing. The powerup boost is permanent!
        break;
      default: console.log("Error in addPowerup: powerupName " + powerupName + " is not recognized!"); 
        break;
    }
  },
  
  extend: {
    powerupFeedback: function(feedbackOnTaken, soundOnTaken) {
      // Add a feedback display for textual feedback
      if ( !this.has('feedbackDisplay')) {
        this.add('feedbackDisplay');
      }
      
      // Display textual feedback
      if (feedbackOnTaken) {
        this.displayFeedback(feedbackOnTaken, {
          fillStyle: POWERUP_DEFAULT_FEEDBACKCOLOR
        });
      }
      
      // Play a sound
      if (soundOnTaken) {
        Q.audio.play(soundOnTaken);
      }
    },
    
    addPowerup: function(powerupName, powerupDuration, powerupFeedbackOnTaken, powerupSoundOnTaken) {
      //console.log("Adding powerup: " + powerupName + " for duration: " + powerupDuration);
      this.powerupFeedback(powerupFeedbackOnTaken, powerupSoundOnTaken);
      this.p.powerupsTimeLeft[powerupName] = powerupDuration;
      if ( !this.p.powerupsHeld[powerupName]) {
        this.p.powerupsHeld[powerupName] = true;
        this.powerupable.applyPowerup(powerupName);
      }
      
      this.recalculateStats();
    },
    
    // Recalculates stats
    recalculateStats: function() {
      // Stat boosts
      var boosts = Q.state.get('playerPermanentBoosts')[this.p.spriteId];
      
      // Get default values to calculate from
      var playerDefaultDmg          = this.powerupable.playerDefaultDmg         + boosts.dmg;
      var playerDefaultManaPerShot  = this.powerupable.playerDefaultManaPerShot;
      var playerDefaultMovespeed    = this.powerupable.playerDefaultMovespeed;
      var playerDefaultMaxHealth    = this.powerupable.playerDefaultMaxHealth   + boosts.maxHealth;
      var playerDefaultMaxMana      = this.powerupable.playerDefaultMaxMana     + boosts.maxMana;
      
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
      this.p.maxHealth    = playerDefaultMaxHealth;
      this.p.maxMana      = playerDefaultMaxMana;
    }
  }
});