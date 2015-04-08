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
    var hf = this.entity.p.currentMana / this.entity.p.maxMana;
    var width = this.entity.p.w * MANABAR_WIDTH_SF;
    var height = this.entity.p.h * MANABAR_HEIGHT_SF;
    ctx.fillStyle = color;
    ctx.fillRect(-width/2, -this.entity.p.cy - height - MANABAR_HEIGHT_OFFSET,
          width * hf, height);
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

// ## DmgDisplay component to be attached to a sprite which displays the damages they take
// Usage:
//  1. Call the addDmg(dmg) function when damage is taken to add the dmg to the display buffer
//  2. Call the step(dt) function in the step function of the entity.
//  3. Call the draw(ctx) function in the draw function of the entity.
Q.component("dmgDisplay", {
  added: function() {
    this.entity.p.dmgDisplayDmgList = [];      // damages to be displayed
    this.entity.p.dmgDisplayTimeLeftList = [];  // timeLeft for each damage to be displayed
    this.entity.p.dmgDisplayPosList = [];    // positions x and y of the display for each damage
    this.entity.p.dmgDisplayVx = 0;    // 
    this.entity.p.dmgDisplayVy = -1;  // velocities for the display
    
    this.entity.on('draw', this, 'draw');
    this.entity.on('step', this, 'step');
    this.entity.on('takeDamage', this, 'addDmg')
  },
  
  addDmg: function(dmgAndShooter) {
    if(this.entity.p.takeDamageCooldown > 0){
      return;
    }

    var dmg = dmgAndShooter.dmg;
    this.entity.p.dmgDisplayDmgList.push(dmg);
    this.entity.p.dmgDisplayTimeLeftList.push(1); // display for 1 second
    this.entity.p.dmgDisplayPosList.push([this.entity.p.cx + 10, 0]); // starting position of the display is on the right of the entity
  },
  
  step: function(dt) {
    for (var i = 0; i < this.entity.p.dmgDisplayTimeLeftList.length; i++) {
      this.entity.p.dmgDisplayTimeLeftList[i] -= dt;
      if (this.entity.p.dmgDisplayTimeLeftList[i] <= 0) {
        // No need to display anymore, so remove it
        this.entity.p.dmgDisplayTimeLeftList.splice(i, 1);
        this.entity.p.dmgDisplayDmgList.splice(i, 1);
        this.entity.p.dmgDisplayPosList.splice(i, 1);
      } else {
        // Need to display, so shift by vx, vy
        this.entity.p.dmgDisplayPosList[i][0] += this.entity.p.dmgDisplayVx;
        this.entity.p.dmgDisplayPosList[i][1] += this.entity.p.dmgDisplayVy;
      }
    }
  },
  
  draw: function(ctx) {
    ctx.font = "15px "+FONT_FAMILY;
    ctx.textAlign = "left";
    ctx.fillStyle = 'red';
    for (var i = 0; i < this.entity.p.dmgDisplayDmgList.length; i++) {
      ctx.fillText(this.entity.p.dmgDisplayDmgList[i], 
            this.entity.p.dmgDisplayPosList[i][0], this.entity.p.dmgDisplayPosList[i][1]);
    }
  }
});

Q.component('2dLadder', {
  added: function(){  
    var entity = this.entity;
    Q._defaults(entity.p,{
      type: Q.SPRITE_UI, // ladder is ui element
      collisionMask: Q.SPRITE_ACTIVE // ladder only collides with player
    });
    entity.on('hit',this,"collision");
  },

  collision: function(col,last) {
    if(col.obj.isA("Ladder")){
      var entity = this.entity;
      entity.trigger("onLadder", col);
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
      collisionMask: Q.SPRITE_ALL // Eleballs collide with anything except
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
    
    // Don't collide with powerups
    if (col.obj.isA('Powerup')) {
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
      console.log("Eleball-eleball collision");
      var i = entity.p.element,
        j = other.p.element;
      console.log("i = " + i + " j = " + j);
      if (i == j) {
        // Case 1, destroy each other
        console.log("Case 1, " + ELEBALL_ELEMENTNAMES[i] 
              + " destroys and gets destroyed by " + ELEBALL_ELEMENTNAMES[j]);

        removeSprite(entity.p.entityType, entity.p.spriteId);

        // Play sound
        if ( !entity.p.soundIsAnnoying) {
          Q.audio.play(ELEBALL_ELEMENTSOUNDS[i]);
        }
      } else if ( (j-i == 1) || (j-i == 1-ELEBALL_ELEMENTNAMES.length) ){
        // Case 2, this eleball destroys the other and passes through
        console.log("Case 2, " + ELEBALL_ELEMENTNAMES[i] 
              + " destroys " + ELEBALL_ELEMENTNAMES[j]);
        
        removeSprite(other.p.entityType, other.p.spriteId);

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
      console.log("In 2dEleball: triggering onHit");
      entity.trigger("onHit", col);

      removeSprite(entity.p.entityType, entity.p.spriteId);
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