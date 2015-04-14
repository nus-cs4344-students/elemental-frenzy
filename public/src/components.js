"use strict";

// ## Healthbar constants
var HEALTHBAR_WIDTH_SF = 1.5;
var HEALTHBAR_HEIGHT_SF = 0.2;
var HEALTHBAR_HEIGHT_OFFSET = 9.0;

// ## manaBar constants
var MANABAR_WIDTH_SF = 1.5;
var MANABAR_HEIGHT_SF = 0.2;
var MANABAR_HEIGHT_OFFSET = 2.0;

// ## localPerceptionFilter constants
var LPF_TOTALTIME = 0.5; // in seconds

var updateInterval = 100;

// ## Healthbar component to be attached to an entity with currentHealth and maxHealth
// Usage:
//  1. Ensure the entity it is attached to has a p.currentHealth and p.maxHealth property,
//  2. then call the draw(ctx) method of the healthBar in the draw method of the entity.
Q.component("healthBar", {
  added: function() {
    this.entity.on('draw', this, 'draw');
  },
  
  draw: function(ctx) {
    var color = '#FF0000'; // defaults to red
    if (this.entity.isA('Player')) {
      color = '#00FF00'; // player healthbar is green
    }
    var hf = this.entity.p.currentHealth / this.entity.p.maxHealth;
    if (this.entity.isA('Player') && hf <= 0.5) {
      color = 'yellow';
      if (hf <= 0.25) {
        color = 'brown';
      }
    }
    var width = this.entity.p.w * HEALTHBAR_WIDTH_SF;
    var height = this.entity.p.h * HEALTHBAR_HEIGHT_SF;
    ctx.fillStyle = color;
    ctx.fillRect(-width/2, -this.entity.p.cy - height - HEALTHBAR_HEIGHT_OFFSET,
          width * hf, height);
    ctx.fillStyle = "black";
    ctx.strokeRect(-width/2, -this.entity.p.cy - height - HEALTHBAR_HEIGHT_OFFSET,
          width, height);
  }
});

// ## Manabar component to be attached to an entity with currentMana and maxMana
// Usage:
//  1. Ensure the entity it is attached to has a p.currentMana and p.maxMana property,
//  2. then call the draw(ctx) method of the manaBar in the draw method of the entity.
Q.component("manaBar", {
  added: function() {
    this.entity.on('draw', this, 'draw');
  },
  
  draw: function(ctx) {
    var color = '#FF00FF'; // defaults to purple
    if (this.entity.isA('Player')) {
      color = '#1589FF'; // player manaBar is light blue
    }
    var mf = this.entity.p.currentMana / this.entity.p.maxMana;
    if (mf <= 0.5) {
      color = '#3BB9FF';
      if (mf <= 0.25) {
        color = 'cyan';
      }
    }
    var width = this.entity.p.w * MANABAR_WIDTH_SF;
    var height = this.entity.p.h * MANABAR_HEIGHT_SF;
    ctx.fillStyle = color;
    ctx.fillRect(-width/2, -this.entity.p.cy - height - MANABAR_HEIGHT_OFFSET,
          width * mf, height);
    ctx.fillStyle = "black";
    ctx.strokeRect(-width/2, -this.entity.p.cy - height - MANABAR_HEIGHT_OFFSET,
          width, height);
  }
});

// ## Namebar component to be attached to a player/actor which displays their name above them
// Usage:
//  1. Ensure the entity it is attached to has a p.name property,
//  2. then call the draw(ctx) method of the nameBar in the draw method of the entity.
Q.component("nameBar", {
  added: function() {
    this.entity.on('draw', this, 'draw');
  },
  
  draw: function(ctx) {
    ctx.font = "15px "+FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.textBaseline = "alphabetic";
    var entity = this.entity;
    var y = -entity.p.cy - 20;
    ctx.fillText(this.entity.p.name, 0, y);
  }
});

// ## feedbackDisplay component to be attached to a sprite which displays text feedback
// Usage:
//  1. Call the displayFeedback function of the sprite to add a text, [fontcolor], [fontsize in px], [font family] to the buffer
//  2. Call the step(dt) function in the step function of the entity.
//  3. Call the draw(ctx) function in the draw function of the entity.
Q.component("feedbackDisplay", {
  added: function() {
    this.feedbackList = [];           // feedback to be displayed
    this.feedbackTimeLeftList = [];   // timeLeft for each feedback to be displayed
    this.feedbackDisplayPosList = []; // positions x and y of the display for each damage
    this.feedbackDisplayVx = 0;       // 
    this.feedbackDisplayVy = -1;      // velocities for the display
    
    this.entity.on('draw', this, 'draw');
    this.entity.on('step', this, 'step');
  },
  
  step: function(dt) {
    for (var i = 0; i < this.feedbackTimeLeftList.length; i++) {
      this.feedbackTimeLeftList[i] -= dt;
      if (this.feedbackTimeLeftList[i] <= 0) {
        // No need to display anymore, so remove it
        this.feedbackTimeLeftList.splice(i, 1);
        this.feedbackDisplayDmgList.splice(i, 1);
        this.feedbackDisplayPosList.splice(i, 1);
      } else {
        // Need to display, so shift by vx, vy
        this.feedbackDisplayPosList[i][0] += this.feedbackDisplayVx;
        this.feedbackDisplayPosList[i][1] += this.feedbackDisplayVy;
      }
    }
  },
  
  draw: function(ctx) {
    for (var i = 0; i < this.feedbackList.length; i++) {
      var feedback = this.feedbackList[i].text;
      var options = this.feedbackList[i].options;
      ctx.font = options.fontSize + "px " + options.fontFamily;
      ctx.textAlign = options.textAlign;
      ctx.fillStyle = options.fillStyle;
      ctx.fillText(feedback, 
            this.feedbackDisplayPosList[i][0], this.feedbackDisplayPosList[i][1]);
    }
  },
  
  extend: {
    displayFeedback: function(text, options) {
      // No text, don't bother doing anything
      if (!text) {
        return;
      }
      
      options = options || {};
      Q._defaults(options, {
        fillStyle: 'black',
        fontSize: 15,
        fontFamily: FONT_FAMILY,
        textAlign: 'left',
        displayTime: 2, // in seconds
        offset: 10 // the offset of the text from the center of the sprite
      });
      
      // Adds the feedback into the buffer
      var feedbackDisplay = this.feedbackDisplay;
      feedbackDisplay.feedbackList.push({text: text, options: options});
      feedbackDisplay.feedbackTimeLeftList.push(options.displayTime); 
      feedbackDisplay.feedbackDisplayPosList.push([this.p.cx + options.offset, 0]);
    }
  }
});

// ## DmgDisplay component to be attached to a sprite which displays the damages they take
// Usage:
//  1. Call the addDmg(dmg) function when damage is taken to add the dmg to the display buffer
//  2. Call the step(dt) function in the step function of the entity.
//  3. Call the draw(ctx) function in the draw function of the entity.
Q.component("dmgDisplay", {
  added: function() {
    this.dmgDisplayDmgList = [];      // damages to be displayed
    this.dmgDisplayTimeLeftList = [];  // timeLeft for each damage to be displayed
    this.dmgDisplayPosList = [];    // positions x and y of the display for each damage
    this.dmgDisplayVx = 0;    // 
    this.dmgDisplayVy = -1;  // velocities for the display
    
    this.entity.on('draw', this, 'draw');
    this.entity.on('step', this, 'step');
    this.entity.on('takeDamage', this, 'addDmg');
  },
  
  addDmg: function(dmgAndShooter) {
    if(this.entity.p.takeDamageCooldown > 0){
      return;
    }

    var dmg = dmgAndShooter.dmg;
    this.dmgDisplayDmgList.push(dmg);
    this.dmgDisplayTimeLeftList.push(2); // display for 2 seconds
    this.dmgDisplayPosList.push([this.entity.p.cx + 10, 0]); // starting position of the display is on the right of the entity
  },
  
  step: function(dt) {
    for (var i = 0; i < this.dmgDisplayTimeLeftList.length; i++) {
      this.dmgDisplayTimeLeftList[i] -= dt;
      if (this.dmgDisplayTimeLeftList[i] <= 0) {
        // No need to display anymore, so remove it
        this.dmgDisplayTimeLeftList.splice(i, 1);
        this.dmgDisplayDmgList.splice(i, 1);
        this.dmgDisplayPosList.splice(i, 1);
      } else {
        // Need to display, so shift by vx, vy
        this.dmgDisplayPosList[i][0] += this.dmgDisplayVx;
        this.dmgDisplayPosList[i][1] += this.dmgDisplayVy;
      }
    }
  },
  
  draw: function(ctx) {
    ctx.font = "20px "+FONT_FAMILY;
    ctx.textAlign = "left";
    ctx.fillStyle = 'red';
    for (var i = 0; i < this.dmgDisplayDmgList.length; i++) {
      ctx.fillText("-" + this.dmgDisplayDmgList[i], 
            this.dmgDisplayPosList[i][0], this.dmgDisplayPosList[i][1]);
    }
  }
});

// Implements a local perception filter using 4 variables:
// 1. lpfNeededX - (unchanging) the total extra distance in the x-axis that needs to be covered
// 2. lpfNeededY - (unchanging) the total extra distance in the y-axis that needs to be covered
// 3. lpfTimeLeft - (starts at LPF_TOTALTIME and decreases to 0) amount of time left to finish travelling the extra distance needed
// 4. lpfTotalTime - (constant) total amount of time to perform the local perception filter
Q.component('localPerceptionFilter', {
  added: function() {
    var entity = this.entity;
    Q._defaults(entity.p, {
      lpfNeededX: 0,
      lpfNeededY: 0,
      lpfTimeLeft: LPF_TOTALTIME,
      lpfTotalTime: LPF_TOTALTIME
    });
    entity.on('step', this, "step");
  },
  
  step: function(dt) {
    var entity = this.entity;
    if (entity.p.lpfTimeLeft > 0) {
      
      var multiplier = 1.0/entity.p.lpfTotalTime;
      var t = Math.min(entity.p.lpfTimeLeft, dt);
      entity.p.lpfTimeLeft -= t;
      
      var dx = entity.p.lpfNeededX * t * multiplier;
      var dy = entity.p.lpfNeededY * t * multiplier;
      
      entity.p.x += dx;
      entity.p.y += dy;
    } else {
      entity.p.lpfTimeLeft = 0;
    }
  }
});

// ## 2dEleball component that is an extension of the '2d' component provided by Quintus (in Quintus_2d.js)
//   Modifies what happens on collision with another eleball
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
      collisionMask: Q.SPRITE_ALL 
                      ^ Q.SPRITE_POWERUP 
                      ^ Q.SPRITE_PASSIVE, // Eleballs collide with anything except powerups and passive things like ladders
      sensor: true
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
    // Don't collide with the shooter of the eleball
    if ( (col.obj.isA('Actor') || col.obj.isA('Player')) && col.obj.p.spriteId == this.entity.p.shooterId ){
      // console.log("Eleball passing object!!!");
      return;
    }
    
    // Don't collide with powerups and ladders
    if (col.obj.isA('Powerup') || col.obj.isA('Ladder')) {
      return;
    }
    
    // Don't destroy eleballs on hit with enemy players if we are NOT the server (only the server decides this)
    if ( !this.entity.p.isServerSide && col.obj.isA('Actor') ) {
      return;
    }
    
    var entity = this.entity;
    var other = col.obj;
    if (other.has("2dEleball")) {
      // Eleball - eleball collision
      //console.log("Eleball-eleball collision");
      var i = entity.p.element,
        j = other.p.element;
      console.log("i = " + i + " j = " + j);
      if (i == j) {
        // Case 1, destroy each other
        //console.log("Case 1, " + ELEBALL_ELEMENTNAMES[i] 
        //      + " destroys and gets destroyed by " + ELEBALL_ELEMENTNAMES[j]);

        removeSprite(entity.p.entityType, entity.p.spriteId);

        // Play sound
        if ( !entity.p.soundIsAnnoying) {
          Q.audio.play(ELEBALL_ELEMENTSOUNDS[i]);
        }
      } else if ( (j-i == 1) || (j-i == 1-ELEBALL_ELEMENTNAMES.length) ){
        // Case 2, this eleball destroys the other and passes through
        //console.log("Case 2, " + ELEBALL_ELEMENTNAMES[i] 
        //      + " destroys " + ELEBALL_ELEMENTNAMES[j]);
        
        removeSprite(other.p.entityType, other.p.spriteId);

        // Play sound
        if ( !other.p.soundIsAnnoying) {
          Q.audio.play(ELEBALL_ELEMENTSOUNDS[j]);
        }
      } else if (Math.abs(i-j) == 2) {
        //console.log("Case 3, " + ELEBALL_ELEMENTNAMES[i] 
        //      + " passes through " + ELEBALL_ELEMENTNAMES[j]);
      }
      entity.trigger("onHit", col);
    } else {
      //console.log("In 2dEleball: triggering onHit");
      entity.trigger("onHit", col);

      removeSprite(entity.p.entityType, entity.p.spriteId);
    }
  },

  step: function(dt) {
    var p = this.entity.p,
    dtStep = dt;
    
    // If eleball goes out of the game world too far, destroy it immediately
    var tileLayer = Q.stage(STAGE_LEVEL)._collisionLayers[0];
    var gameWorldWidth = tileLayer.p.w;
    var gameWorldHeight = tileLayer.p.h;
    var MARGIN_OUTOFBOUNDS = 500;
    if (p.x < -MARGIN_OUTOFBOUNDS || p.y < -MARGIN_OUTOFBOUNDS ||
        p.x > (gameWorldWidth + MARGIN_OUTOFBOUNDS) || p.y > (gameWorldHeight + MARGIN_OUTOFBOUNDS) ) {
      //console.log("Removing eleball because it exceeded gameworld bounds");
      removeSprite(p.entityType, p.spriteId);
    }
    
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

      this.entity.stage.collide(this.entity, {maxCol: 1});
      dtStep -= dt;
    }
  }
});

// ## Attach to server side entities for them to send updates at a regular interval
Q.component("serverSprite", {
  added: function() {
    var that = this.entity;
    
    that.p.isServerSide = true;
    
    // Server side sprites will send updates periodically
    this.serverUpdateInterval = setInterval(function() {    
      // console.log("EntityType " + entity.p.entityType + " id " + entity.p.spriteId + " in session "+entity.p.sessionId+" sending update from server");
      
      Q.input.trigger('broadcastAll', {eventName:'updateSprite', eventData: {p: that.p} });
    }, updateInterval);
    
    that.on('destroyed', this, 'destroy');
  },
  
  destroy: function() {
    console.log("Destroying server side updating interval");
    clearInterval(this.serverUpdateInterval);
  }
});

// ## Attached to players on the server side for simulation
Q.component("serverPlatformerControls", {
  defaults: {
    speed: 200,
    jumpSpeed: -300,
    collisions: []
  },

  added: function() {
    var p = this.entity.p;
  
    this.entity.inputs = [];

    Q._defaults(p,this.defaults);

    this.entity.on("step",this,"step");
    this.entity.on("bump.bottom",this,"landed");

    p.landed = 0;
    p.direction ='right';
  },

  landed: function(col) {
    var p = this.entity.p;
    p.landed = 1/5;
  },

  step: function(dt) {
    var p = this.entity.p;
  
    if(p.ignoreControls === undefined || !p.ignoreControls) {
      var collision = null;

      // Follow along the current slope, if possible.
      if(p.collisions !== undefined && p.collisions.length > 0 && (this.entity.inputs['left'] || this.entity.inputs['right'] || p.landed > 0)) {
        if(p.collisions.length === 1) {
          collision = p.collisions[0];
        } else {
          // If there's more than one possible slope, follow slope with negative Y normal
          collision = null;

          for(var i = 0; i < p.collisions.length; i++) {
            if(p.collisions[i].normalY < 0) {
              collision = p.collisions[i];
            }
          }
        }

        // Don't climb up walls.
        if(collision !== null && collision.normalY > -0.3 && collision.normalY < 0.3) {
          collision = null;
        }
      }

      if(this.entity.inputs['left']) {
        p.direction = 'left';
        if(collision && p.landed > 0) {
          p.vx = p.speed * collision.normalY;
          p.vy = -p.speed * collision.normalX;
        } else {
          p.vx = -p.speed;
        }
      } else if(this.entity.inputs['right']) {
        p.direction = 'right';
        if(collision && p.landed > 0) {
          p.vx = -p.speed * collision.normalY;
          p.vy = p.speed * collision.normalX;
        } else {
          p.vx = p.speed;
        }
      } else {
        p.vx = 0;
        if(collision && p.landed > 0) {
          p.vy = 0;
        }
      }

      if(p.landed > 0 && (this.entity.inputs['up']) && !p.jumping) {
        p.vy = p.jumpSpeed;
        p.landed = -dt;
        p.jumping = true;
      } else if(this.entity.inputs['up']) {
        this.entity.trigger('jump', this.entity);
        p.jumping = true;
      }

      if(p.jumping && !(this.entity.inputs['up'])) {
        p.jumping = false;
        this.entity.trigger('jumped', this.entity);
        if(p.vy < p.jumpSpeed / 3) {
          p.vy = p.jumpSpeed / 3;
        }
      }
    }
    p.landed -= dt;
  }
});