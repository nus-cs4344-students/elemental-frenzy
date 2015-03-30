"use strict";

// ## Enemy constants
var ENEMY_DEFAULT_MAXHEALTH = 50;
var ENEMY_DEFAULT_COOLDOWN = 1.0;
var ENEMY_DEFAULT_DMG = 2;
var ENEMY_ELEBALL_DEFAULT_DMG = 5;
var ENEMY_DEFAULT_ELEMENT = 0; // fire
var ENEMY_CHARACTERS = ["character_orc", "character_skeleton"];
var ENEMY_ANIMATION = "enemy";
var ENEMY_NO_FIRE_ANIMATION = "no_fire";

// ## Enemy Sprite
// Create the Enemy class to add in some baddies
Q.Sprite.extend("Enemy",{
  
  init: function(p) {
    this._super(p, { 
    entityType: 'ENEMY',
    sheet: ENEMY_CHARACTERS[Math.random() > 0.5 ? 0 : 1],
    sprite: ENEMY_ANIMATION,
    vx: 100,  
    type: Q.SPRITE_ENEMY,
    collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_PARTICLE ^ Q.SPRITE_ENEMY,
    shootRandomly: true,  // make enemy shoot randomly if true
    cooldown: 0,      // enemy has a cooldown as well
    dmg: ENEMY_DEFAULT_DMG,
    element: ENEMY_DEFAULT_ELEMENT,
    currentHealth: ENEMY_DEFAULT_MAXHEALTH,
    maxHealth: ENEMY_DEFAULT_MAXHEALTH,
    name: 'enemyAi',
    enemyId: -1,
    fireAngleRad: 0,
    fireAngleDeg: 0,
    isServerSide: false,
    update: true
    });

    // Enemies use the Bounce AI to change direction 
    // whenver they run into something.
    this.add('2d, aiBounce, healthBar, dmgDisplay, animation');

    // Listen for a sprite collision, if it's the player,
    // end the game unless the enemy is hit on top
    this.on("bump.left,bump.right,bump.bottom",function(collision) {
      if(collision.obj.isA("Player")) { 
        console.log(this.p.name + " triggering takeDamage")
        collision.obj.trigger('takeDamage', {dmg: this.p.dmg, shooter: this.p.name});
      }
    });

    // If the enemy gets hit on the top, destroy it
    // and give the user a "hop"
    this.on("bump.top",function(collision) {
      if(collision.obj.isA("Player")) { 
      this.trigger('takeDamage', {dmg: collision.obj.p.dmg, shooter: collision.obj.p.name});
      collision.obj.p.vy = -300;
      }
    });
    
    this.on('takeDamage');
    
    this.on('fire');  
    this.on('fired'); 
    },
  
  takeDamage: function(dmgAndShooter) {
    var dmg = dmgAndShooter.dmg,
        shooterEntityType = dmgAndShooter.shooter.entityType,
        shooterId = dmgAndShooter.shooter.spriteId;
    this.p.currentHealth -= dmg;
    if (this.p.currentHealth <= 0) {
      Q.state.trigger("enemyDied", {entityType: shooterEntityType, spriteId: shooterId});
      removeEnemySprite(this.p.spriteId);
    }
  },
    
  fire: function(angle){
    if (this.p.cooldown > 0) {
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
    var ballToPlayerY = Math.abs((clonedProps.h/2 + eleball.p.h/2) * Math.sin(clonedProps.fireAngleRad)) * ELEBALL_PLAYER_SF;
    if(clonedProps.fireAngleDeg <= 360 && clonedProps.fireAngleDeg > 180){
      // deduct ball width due to the direction of the ball is set to be default at right direction
      eleball.p.y = clonedProps.y - ballToPlayerY;
    } else {
      eleball.p.y = clonedProps.y + ballToPlayerY;
    }

    var ballToPlayerX = Math.abs((clonedProps.w/2 + eleball.p.w/2) * Math.cos(clonedProps.fireAngleRad)) * ELEBALL_PLAYER_SF;
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

    this.p.cooldown = ENEMY_DEFAULT_COOLDOWN;
  },
  
  step: function(dt) {
    this.dmgDisplay.step(dt);
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
        this.trigger('fire', Math.random() * 360);

        // randomly set a cooldown between 2.0 and 5.0
        this.p.cooldown = Math.random() * 3 + ENEMY_DEFAULT_COOLDOWN; 
      }
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


Q.animations(ENEMY_ANIMATION, {
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