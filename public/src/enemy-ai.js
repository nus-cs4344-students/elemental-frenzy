"use strict";

// ## Enemy constants
var ENEMY_DEFAULT_MAXHEALTH = 200;
var ENEMY_DEFAULT_COOLDOWN = 1.0;
var ENEMY_DEFAULT_DMG = 10;
var ENEMY_ELEBALL_DEFAULT_DMG = 20;
var ENEMY_DEFAULT_RANGE = 400; // only fire at players 400 distance away when shooting at nearest player
var ENEMY_DEFAULT_ELEMENT = 0; // fire (but enemy elements will randomly change)
var ENEMY_CHARACTERS = ["character_orc", "character_skeleton"];
var ENEMY_NUM_CHARACTERS = 2; // 2 different sprites only at the moment
var ENEMY_ANIMATION = "enemy";
var ENEMY_NO_FIRE_ANIMATION = "no_fire";
var ENEMY_FIRE_ANIMATION_TIME = 0.5;

var ENEMYAISYSTEM_ENEMY_LIMIT = 1; // 1 enemy at most at any one time
var ENEMYAISYSTEM_ENEMY_SPAWNTIME = 6000; // 6 seconds
var ENEMYAISYSTEM_ENEMY_POWERUPDROP = "POWERUP_CLASS_ENEMYDROP_DMGHPMP"; // Powerup dropped upon enemy's death

// ## Enemy Sprite
// Create the Enemy class to add in some baddies
Q.Sprite.extend("Enemy",{
  
  init: function(p) {
    this._super(p, { 
    entityType: 'ENEMY',
    name: 'enemyAi',
    spriteId: -1,
    sheet: ENEMY_CHARACTERS[Math.floor(Math.random() * ENEMY_NUM_CHARACTERS)],
    sprite: ENEMY_ANIMATION,
    vx: 100,  
    type: Q.SPRITE_ENEMY,
    collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_ENEMY,
    shootRandomly: true,  // make enemy shoot randomly if true
    shootNearestPlayer: true, // make enemy shoot nearest player if true (overrides shootRandomly)
    range: ENEMY_DEFAULT_RANGE, // default range which if a player falls within, the enemy can shoot at him (if shootNearestPlayer is set)
    firingCooldown: 0,      // enemy has a firingCooldown as well
    dmg: ENEMY_DEFAULT_DMG,
    element: ENEMY_DEFAULT_ELEMENT,
    currentHealth: ENEMY_DEFAULT_MAXHEALTH,
    maxHealth: ENEMY_DEFAULT_MAXHEALTH,
    fireAngleRad: 0,
    fireAngleDeg: 0,
    isServerSide: false,
    update: true,
    isDead: false
    });

    // Enemies use the Bounce AI to change direction 
    // whenver they run into something.
    this.add('2d, aiBounce, healthBar, dmgDisplay, animation');

    // Listen for a sprite collision, if it's the player,
    // end the game unless the enemy is hit on top
    this.on("bump.left,bump.right,bump.bottom,bump.top",function(collision) {
      if(collision.obj.isA("Player")) { 
        collision.obj.takeDamage({dmg: this.p.dmg, shooterEntityType: this.p.entityType, shooterSpriteId: this.p.spriteId});
      }
    });

    /* Not implemented at the moment (enemy will always damage players when touched)
    // If the enemy gets hit on the top, destroy it
    // and give the user a "hop"
    this.on("bump.top",function(collision) {
      if(collision.obj.isA("Player")) { 
      this.takeDamage({dmg: collision.obj.p.dmg, shooterEntityType: collision.obj.p.entityType, shooterSpriteId: collision.obj.p.spriteId});
      collision.obj.p.vy = -300;
      }
    });
    */
    
    this.on('fire');  
    this.on('fired'); 
  },
  
  takeDamage: function(dmgAndShooter) {
    var dmg = dmgAndShooter.dmg,
        shooterEntityType = dmgAndShooter.shooterEntityType,
        shooterId = dmgAndShooter.shooterSpriteId;
        
    // server side damage calculation
    if (this.p.isServerSide){
      var dmg = dmgAndShooter.dmg,
          shooterEntityType = dmgAndShooter.shooterEntityType,
          shooterId = dmgAndShooter.shooterSpriteId;
      
      this.p.currentHealth -= dmg;
      
      console.log(this.p.entityType + " " + this.p.spriteId + " took " + dmg + " damage by " + shooterEntityType + 
                  " " + shooterId + ". currentHealth = " + this.p.currentHealth);

  
      Q.input.trigger('broadcastAll', {
        eventName: 'spriteTookDmg',
        eventData: {dmg: dmg,
                    victim: {entityType: this.p.entityType, spriteId: this.p.spriteId},
                    shooter: {entityType: shooterEntityType, spriteId: shooterId}
                  }
      });
      
      if (this.p.currentHealth <= 0) {
        this.die(shooterEntityType, shooterId);
      }
      
      // Mainly for the dmgDisplay
      this.trigger('takeDamage', {dmg: dmg, shooterEntityType: shooterEntityType, shooterSpriteId: shooterId});
    }
  },
  
  die: function(killerEntityType, killerId) {
    this.p.isDead = true;

    var killerName = getSprite(killerEntityType, killerId).p.name;
    
    var vType = this.p.entityType;
    var vId = this.p.spriteId;
    var vCharId = this.p.characterId;
    var vSessionId = this.p.sessionId;


    console.log(this.p.name + " died to " + killerName);
  
    if (this.p.isServerSide) {
      
      Q.state.trigger("enemyDied", {entityType: killerEntityType, spriteId: killerId});
    
      Q.input.trigger('broadcastAll', {eventName: 'spriteDied', eventData: {
        victim: {entityType: vType, spriteId: vId}, 
        killer: {entityType: killerEntityType, spriteId: killerId}
      }});
      
      this.trigger('died', {x: this.p.x, y: this.p.y});
    }
    
    // Show the enemy killed info
    var msg = vType+" "+vId+" '"+getSprite(vType,vId).p.name+"' "+
            "just got killed by "+killerEntityType+" "+killerId+" '"+killerName+"'";
    Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg});

    removeEnemySprite(this.p.spriteId);
  },
    
  fire: function(angle){
    if (this.p.firingCooldown > 0) {
      return;
    }

    var angleDeg = Math.min(360, Math.max(180, angle));
    var angleRad = angleDeg * Math.PI / 180;

    this.p.fireAngleRad = angleRad;
    this.p.fireAngleDeg = angleDeg;

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

    if(this.has('animation')){
      this.play(animationName, 1);
    }else{
      this.trigger('fired');
    }
  },

  fired: function(){
    // reset fire animation
    this.p.fireAnimation = ENEMY_NO_FIRE_ANIMATION;

    // Only on the server side do we insert this immediately.
    // On the client side we have to wait for the update message
    if (!this.p.isServerSide){
      return;
    }
 
    // Clone to avoid bad stuff from happening due to references
    var clonedProps = this.p;
    
    // compute firing angle to the target
    var angleRad = Math.atan2(this.p.targetY - this.p.y, this.p.targetX - this.p.x) ;
    var angleDeg = -angleRad * 180 / Math.PI;

    if(angleDeg>0){
      angleDeg = 360 - angleDeg;
    }else{
      angleDeg = -angleDeg;
    }
    
    // Will be used below
    clonedProps.fireAngleDeg = angleDeg;
    clonedProps.fireAngleRad = angleRad;
    
    var eleballProperties = { isServerSide: clonedProps.isServerSide,
                              sessionId: clonedProps.sessionId,
                              element : clonedProps.element,
                              sheet : ELEBALL_ELEMENTNAMES[clonedProps.element],
                              shooter : clonedProps.name,
                              shooterId : clonedProps.spriteId,
                              frame : ELEBALL_FRAME,
                              angle : clonedProps.fireAngleDeg, // angle 0 starts from 3 o'clock then clockwise
                              vx : ELEBALL_DEFAULT_VX * Math.cos(clonedProps.fireAngleRad),
                              vy : ELEBALL_DEFAULT_VY * Math.sin(clonedProps.fireAngleRad)
    };

    var eleball = addEnemyEleballSprite(getNextSpriteId(), eleballProperties);

    // fire ball location offset from player
    var ballToPlayerY = Math.abs((clonedProps.h/2 + eleball.p.h/2) * Math.sin(clonedProps.fireAngleRad)) * ELEBALL_ENEMY_SF;
    if(clonedProps.fireAngleDeg <= 360 && clonedProps.fireAngleDeg > 180){
      // deduct ball width due to the direction of the ball is set to be default at right direction
      eleball.p.y = clonedProps.y - ballToPlayerY;
    } else {
      eleball.p.y = clonedProps.y + ballToPlayerY;
    }

    var ballToPlayerX = Math.abs((clonedProps.w/2 + eleball.p.w/2) * Math.cos(clonedProps.fireAngleRad)) * ELEBALL_ENEMY_SF;
    if(clonedProps.fireAngleDeg <= 270 && clonedProps.fireAngleDeg > 90){
      eleball.p.x = clonedProps.x - ballToPlayerX;
    } else {
      eleball.p.x = clonedProps.x + ballToPlayerX;
    }
    
    // server side broadcast to every player
    var eleballData = { entityType: 'ENEMYELEBALL',
                        spriteId: eleball.p.spriteId,
                        p: eleball.p
                      };

    Q.input.trigger('broadcastAll', {eventName:'addSprite', eventData: eleballData});

    this.p.firingCooldown = ENEMY_DEFAULT_COOLDOWN;
  },
  
  findNearestPlayerInlineOfSight: function() {
    var enemy = this;
    // Find the nearest player to shoot (if any)
    var players = Q("Player", STAGE_LEVEL);
    if (typeof players === 'undefined') {
      return;
    }
    var playerToShoot;
    var minDist = enemy.p.range + 1;
    players.each(function() {
      var player = this;
      var dx = player.p.x - enemy.p.x;
      var dy = player.p.y - enemy.p.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      // Test for within range or not
      if (dist < enemy.p.range && dist < minDist) {
        // Good, player is in the range and may be nearer than the previous player found (if any)
        // Finally, test for line-of-sight
        var tileLayer = Q.stage(STAGE_LEVEL)._collisionLayers[0];
        var tileW = tileLayer.p.tileW;
        var tileH = tileLayer.p.tileH;
        var isPlayerOnLeft = dx < 0;
        var isPlayerOnTop = dy < 0;
        var distToStep = Math.min(Math.min(tileW, tileH) - 0.5, 5);
        var xToStep, yToStep;
        if (dx == 0 && dy == 0) {
          // The player is exactly on the enemy... should not be possible!
          console.log("Error in enemy-ai: findNearestPlayerInLineOfSight(): the player is exactly on the enemy?! dx = dy = 0!!!");
          return;
        } else if (dx == 0) {
          yToStep = distToStep;
          xToStep = 0;
        } else if (dy == 0) {
          xToStep = distToStep;
          yToStep = 0;
        } else {
          // Math... dx^2 + dy^2 = dist^2 (where dx is really xToStep and dy is yToStep)
          // dy/dx must be kept constant... call this constant dydx
          // dy = dydx * dx
          // so dx^2 + (dydx * dx)^2 = dist^2
          // and dx = dist/sqrt(dydx^2+1)
          // and similarly, dy = (dist*dydx)/sqrt(dydx^2+1))
          var dydx = dy/dx;
          xToStep = Math.abs(distToStep/Math.sqrt(dydx*dydx+1));
          yToStep = Math.abs((distToStep*dydx)/Math.sqrt(dydx*dydx+1));
        }
        
        // Ensure xToStep and yToStep have correct signs
        xToStep *= isPlayerOnLeft ? -1 : 1;
        yToStep *= isPlayerOnTop ? -1 : 1;
        
        //console.log("distToStep " + distToStep + " xToStep " + xToStep + " yToStep " + yToStep);
        // Try to find a collision along the line to the player while adding the xToStep and yToStep
        var isInLineOfSight = true;
        var x = enemy.p.x;
        var y = enemy.p.y;
        var tileY, tileX;
        while ( (isPlayerOnLeft ? x >= player.p.x : x <= player.p.x) && (isPlayerOnTop ? y >= player.p.y : y <= player.p.y) ) {
          tileY = Math.floor(y/tileH);
          tileX = Math.floor(x/tileW);
          if (tileLayer.tilePresent(tileX, tileY)) {
            isInLineOfSight = false;
            break;
          }
          x += xToStep;
          y += yToStep;
        }
        
        if (isInLineOfSight) {
          playerToShoot = player;
          minDist = dist;
        }
      }
    });
    
    return playerToShoot;
  },
  
  step: function(dt) {
    // Randomly change elements (elements are integers in range [0...ELEBALL_NUM_ELEMENTS-1])
    this.p.element = Math.floor(Math.random()*ELEBALL_NUM_ELEMENTS);
    
    // Reduce firing cooldown
    this.p.firingCooldown -= dt;
    if (this.p.firingCooldown <= 0) {
      this.p.firingCooldown = 0;
    }
    
    // See if we need to make the enemy shoot
    if (this.p.firingCooldown <= 0 && this.p.shootNearestPlayer) {
      // Make enemy shoot at the nearest player in line of sight
      var playerToShoot = this.findNearestPlayerInlineOfSight();
      if (playerToShoot) {
        // Got a player we can shoot!
        // compute firing angle for animation
        var angleRad = Math.atan2(playerToShoot.p.y - this.p.y, playerToShoot.p.x - this.p.x) ;
        var angleDeg = -angleRad * 180 / Math.PI;

        if(angleDeg>0){
          angleDeg = 360 - angleDeg;
        }else{
          angleDeg = -angleDeg;
        }
        
        console.log("Shooting at " + playerToShoot.p.name + "(" + playerToShoot.p.spriteId + ")");
        
        this.p.targetX = playerToShoot.p.x;
        this.p.targetY = playerToShoot.p.y;
        
        // shoot
        this.fire(angleDeg);
        
        // set the firing cooldown
        this.p.firingCooldown = ENEMY_DEFAULT_COOLDOWN;
      }
    } else if (this.p.firingCooldown <= 0 && this.p.shootRandomly) {
      // Make enemies shoot randomly      
      this.fire(Math.random() * 360);

      // set the firing cooldown
      this.p.firingCooldown = ENEMY_DEFAULT_COOLDOWN; 
    }

    if(this.has('animation')){
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
    }
  },
  
  draw: function(ctx) {
    this._super(ctx);
  }
});

Q.component('enemyAiSystem', {
  added: function() {
    var entity = this.entity;
    var that = this;
    
    this.numExistingEnemies = 0;
    
    for (var i = 0; i < ENEMYAISYSTEM_ENEMY_LIMIT; i++) {
      setTimeout(function() {
        if (that.numExistingEnemies >= ENEMYAISYSTEM_ENEMY_LIMIT) {
          return;
        }
        
        that.randomlySpawnEnemy();
      }, ENEMYAISYSTEM_ENEMY_SPAWNTIME);
    }
  },
  
  randomlySpawnEnemy: function() {
    var entity = this.entity;
    var that = this;
    // Spawn enemies in 1 minute's time from the start
    // Get random spawn position
    var tileLayer = entity._collisionLayers[0];
    var randomCoord;
    var randomX, randomY;
    var MARGIN = 0.2 * tileLayer.p.w; // 20% away from the left/right gameworld edges
    // Get random coords for spawning
    do {
      randomCoord = tileLayer.getRandomTileCoordInGameWorldCoord(2);
      randomX = randomCoord.x;
      randomY = randomCoord.y - tileLayer.p.tileH;
    } while (randomX <= MARGIN || randomX >= (tileLayer.p.w - MARGIN) || Q.stage(STAGE_LEVEL).locate(randomX, randomY));
    
    // Spawn and insert the enemy
    console.log("Spawning enemy at (" + randomX + "," + randomY + ")");
    var enemy = new Q.Enemy({x: randomX, y: randomY, spriteId: getNextSpriteId()});
    entity.insert(enemy);
    this.numExistingEnemies++;
    
    // Decrement counter of existing enemies, spawn powerup, and set a new timer to spawn enemy
    enemy.on('died', function(data) { // data consists of coordinates of death for now
      // Decrement counter
      that.numExistingEnemies--;
      // Set timer to spawn new enemy
      setTimeout(function() {
        if (that.numExistingEnemies >= ENEMYAISYSTEM_ENEMY_LIMIT) {
          return;
        }
        
        that.randomlySpawnEnemy();
      }, ENEMYAISYSTEM_ENEMY_SPAWNTIME);
      
      if (!entity.has('powerupSystem')) {
        console.log("Error in trying to spawn powerup on enemy's death: the stage does not have powerupSystem");
        return;
      }
      // Spawn powerup
      entity.spawnPowerup(ENEMYAISYSTEM_ENEMY_POWERUPDROP, data.x, data.y);
    });
  }
});


Q.animations(ENEMY_ANIMATION, {
  run_in: { frames: [7,8,9,10,11,12], rate: 1/6}, 
  run_left: { frames: [20,21,22,23,24,25], rate:1/6 },
  run_out: { frames: [33,34,35,36,37,38], rate:1/6 },
  run_right: { frames: [46,47,48,49,50,51], rate: 1/6}, 
  
  run_left_still: { frames: [22], rate:1/3 },
  run_right_still: { frames: [47], rate: 1/3}, 

  fire_up: { frames: [51,52,53,54,55,56,57,58,59,60,61,62,63], rate: ENEMY_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false},
  fire_left: { frames: [64,65,66,67,68,69,70,71,72,73,74,75,76], rate: ENEMY_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 
  fire_down: { frames: [77,78,79,80,81,82,83,84,85,86,87,88,89], rate: ENEMY_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 
  fire_right: { frames: [90,91,92,93,94,95,96,97,98,99,100,101,102,103,103], rate: ENEMY_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 

  stand_back: { frames: [7], rate: 1/3 },
  stand_left: { frames: [20], rate: 1/3 },
  stand_front: { frames: [33], rate: 1/3 },
  stand_right: { frames: [46], rate: 1/3 }
});