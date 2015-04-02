"use strict";

// ## Player constants
var PLAYER_FIRE = 0;
var PLAYER_EARTH = 1;
var PLAYER_LIGHTNING = 2;
var PLAYER_WATER = 3;
var PLAYER_NAMES = ["Fire", "Earth" , "Lightning", "Water"];
var PLAYER_NAME_COLORS = ["orange", "brown" , "yellow", "cyan"];
var PLAYER_CHARACTERS = ["character_fire", "character_earth" , "character_lightning", "character_water"];
var PLAYER_DEFAULT_MAXHEALTH = 50;
var PLAYER_DEFAULT_MAX_MANA = 50;
var PLAYER_DEFAULT_MANA_PER_SHOT = 15;
var PLAYER_DEFAULT_MANA_REGEN = 0.2;
var PLAYER_DEFAULT_COOLDOWN = 0.3;
var PLAYER_DEFAULT_DMG = 2;
var PLAYER_DEFAULT_CHARACTERID = 0; // fire
var PLAYER_ANIMATION = "character";
var PLAYER_NO_FIRE_ANIMATION = "no_fire";
var PLAYER_DEFAULT_TAKE_DAMAGE_COOLDOWN = 0.5;
var PLAYER_DEFAULT_TOGGLE_ELEMENT_COOLDOWN = 0.1;

// ## Player Sprite
// The very basic player sprite, this is just a normal sprite
// using the player sprite sheet with default controls added to it.
Q.Sprite.extend("Player",{

  // the init constructor is called on creation
  init: function(p, defaultP) {
    
    var that = this;
    p = mergeObjects(p, defaultP);

    // You can call the parent's constructor with this._super(..)
    this._super(p, {
      spriteId: -1,
      entityType: 'PLAYER',
      sprite: PLAYER_ANIMATION,
      x: 410,          
      y: 90,            
      cooldown: 0,    // can fire immediately
      canFire: true,
      maxHealth: PLAYER_DEFAULT_MAXHEALTH,
      currentHealth: PLAYER_DEFAULT_MAXHEALTH,
      maxMana: PLAYER_DEFAULT_MAX_MANA,
      currentMana: PLAYER_DEFAULT_MAX_MANA,
      dmg: PLAYER_DEFAULT_DMG,
      type: Q.SPRITE_ACTIVE,
      characterId: PLAYER_DEFAULT_CHARACTERID,
      fireAnimation: PLAYER_NO_FIRE_ANIMATION,
      fireTargetX: 0, // position x of target in game world
      fireTargetY: 0,  // possition y of target in game world
      isFiring: false,
      isServerSide: false, // a flag so that the server-simulated players will send update messages out
      onLadder: false,
      ladderX: 0,
      takeDamageCooldown: 0,
      toggleElementCooldown: 0,
      update: true//,
      //updateCountdown: 1.0 // countdown before the client side uses the update from the server side, to reduce perceived lag
    });

    this.p.element = this.p.characterId;
    this.p.sheet = PLAYER_CHARACTERS[this.p.characterId];
    this.p.name = PLAYER_NAMES[this.p.characterId];
    
    // Add in pre-made components to get up and running quickly
    // The `2d` component adds in default 2d collision detection
    // and kinetics (velocity, gravity)
    // The `platformerControls` makes the player controllable by the
    // default input actions (left, right to move,  up or action to jump)
    // It also checks to make sure the player is on a horizontal surface before
    // letting them jump.
    this.add('2d, serverPlatformerControls, animation, healthBar, nameBar, dmgDisplay, 2dLadder');

    this.takeDamageIntervalId = -1;

    this.addEventListeners();

    // Add to the game state!
    // Kills = Deaths = 0
    if (typeof Q.state.p.kills[this.p.name] === 'undefined') {
      Q.state.p.kills[this.p.name] = Q.state.p.deaths[this.p.name] = 0;
    }
  },
  
  addEventListeners: function() { 

    if(!this.p.isServerSide){
      this.on('displayScoreScreenUp', this, 'hideScoreScreen');
      this.on('displayScoreScreen', this, 'displayScoreScreen');
    }

    this.on('left, right, up, down,', this, 'move');
    this.on('leftUp, rightUp, upUp, downUp', this, 'moveUp');
    this.on('toggleNextElementUp', this, 'toggleNextElement');
    this.on('takeDamage');
    this.on('fire');
    this.on('fired');
    this.on("onLadder", this, 'climbLadder');
  },

  move: function(e){
    
    if(this.p.isServerSide || !isSessionConnected){
      // server side doesnt need to send key event
      // client side doesnt need to send key when it is not connected
      return;
    }

    var createdEvt = {
      keyCode: e.keyCode
    };
    
    var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  entityType: 'PLAYER',
                  e: createdEvt
    };

    Q.input.trigger('sessionCast', {eventName:'keydown', eventData: eData});
  },

  moveUp: function(e){

    if(this.p.isServerSide || !isSessionConnected){
      // server side doesnt need to send key event
      // client side doesnt need to send key when it is not connected
      return;
    }

    var createdEvt = {
      keyCode: e.keyCode
    };
    
    var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  entityType: 'PLAYER',
                  e: createdEvt
    };

    Q.input.trigger('sessionCast', {eventName:'keyup', eventData: eData});
  },


  displayScoreScreen: function(){

    if(!this.p.isServerSide && !isSessionConnected){
      // client side need to be connected to the server in order
      // to show score screen
      return;
    }

    this.hideScoreScreen();
    Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
  },

  hideScoreScreen: function(){

    if(!this.p.isServerSide && !isSessionConnected){
      // client side need to be connected to the server in order
      // to show score screen
      return;
    }

    Q.clearStage(STAGE_SCORE);
  },

  toggleNextElement: function(e){
    if(this.p.toggleElementCooldown > 0){
      return;
    }

    this.p.toggleElementCooldown = PLAYER_DEFAULT_TOGGLE_ELEMENT_COOLDOWN;

    var nextElement = (Number(this.p.element) + 1) % ELEBALL_ELEMENTNAMES.length;
    this.p.element = nextElement;

    if(!this.p.isServerSide && isSessionConnected){
      var createdEvt = {
        keyCode: e.keyCode
      };
      
      var eData = { sessionId: sessionId,
                    spriteId: selfId,
                    entityType: 'PLAYER',
                    e: createdEvt
      };

      Q.input.trigger('sessionCast', {eventName:'keyup', eventData: eData});

      Q.input.trigger('hudNextElement');
    }
  },

  fire: function(e){
    // console.log("At the START of FIRE function of PLAYER. properties of player: " + getJSON(this.p));
   
    if (this.p.cooldown > 0 || !this.p.canFire || 
        this.p.currentMana < PLAYER_DEFAULT_MANA_PER_SHOT) {
      return;
    }

    // when fire event is trigger, x & y in the event data are translate into game world coordinates
    // during event handling in client socket
    var mouseX = e.x;
    var mouseY = e.y;
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

    // cloning just in case of bad stuff happening due to references
    this.p.fireAnimation = animationName;

    if(this.has('animation')){
      this.play(animationName, 1);
    }else{
      this.trigger('fired');
    }
    
    // console.log("At the END of FIRE function of PLAYER. properties of player: " + getJSON(this.p));
  },

  fired: function(){
    // reset fire animation
    this.p.fireAnimation = PLAYER_NO_FIRE_ANIMATION;
    //console.log("At the START of FIREDDDD function of PLAYER. properties of player: ");
    //console.log(getJSON(this.p));

    //after eleball fired, decrease mana
    this.p.currentMana -= PLAYER_DEFAULT_MANA_PER_SHOT;

    // Only on the server side do we insert this immediately.
    // On the client side we have to wait for the update message
    if (!this.p.isServerSide){
      return;
    }

    // re-compute firing angle with respect to current player position and target position
    var angleRad = Math.atan2(this.p.fireTargetY - this.p.y, this.p.fireTargetX - this.p.x) ;
    var angleDeg = -angleRad * 180 / Math.PI;

    if(angleDeg>0){
      angleDeg = 360 - angleDeg;
    }else{
      angleDeg = -angleDeg;
    }

    // Clone to avoid bad stuff from happening due to references
    var clonedProps = this.p;
    
    //this.p should not be circular
    //console.log("About to create PLAYERELEBALL with properties: " + getJSON(this.p));
    var eleballProperties = { isServerSide: clonedProps.isServerSide,
                              sessionId: clonedProps.sessionId,
                              element : clonedProps.element,
                              sheet : ELEBALL_ELEMENTNAMES[clonedProps.element],
                              shooter : clonedProps.name,
                              shooterId : clonedProps.spriteId,
                              frame : ELEBALL_FRAME,
                              angle : angleDeg, // angle 0 starts from 3 o'clock then clockwise
                              vx : ELEBALL_DEFAULT_VX * Math.cos(angleRad),
                              vy : ELEBALL_DEFAULT_VY * Math.sin(angleRad)
    };

    var eleball = addPlayerEleballSprite(getNextSpriteId(), eleballProperties);

    // fire ball location offset from player
    var ballToPlayerY = Math.abs((clonedProps.h/2 + eleball.p.h/2) * Math.sin(angleRad)) * ELEBALL_PLAYER_SF;
    if(angleDeg <= 360 && angleDeg > 180){
      // deduct ball width due to the direction of the ball is set to be default at right direction
      eleball.p.y = clonedProps.y - ballToPlayerY;
    } else {
      eleball.p.y = clonedProps.y + ballToPlayerY;
    }

    var ballToPlayerX = Math.abs((clonedProps.w/2 + eleball.p.w/2) * Math.cos(angleRad)) * ELEBALL_PLAYER_SF;
    if(angleDeg <= 270 && angleDeg > 90){
      eleball.p.x = clonedProps.x - ballToPlayerX;
    } else {
      eleball.p.x = clonedProps.x + ballToPlayerX;
    }

    // console.log("New PLAYERELEBALL created with sessionId " + this.p.sessionId + " id " + eleball.p.spriteId);
    // console.log("Eleball added to stage, properties: " + getJSON(eleball.p));
    
    // server side broadcast to every player
    var eleballData = { entityType: 'PLAYERELEBALL',
                        spriteId: eleball.p.spriteId,
                        p: eleball.p
                      };

    Q.input.trigger('broadcastAll', {eventName:'addSprite', eventData: eleballData});

    this.p.cooldown = PLAYER_DEFAULT_COOLDOWN;
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
    this.p.takeDamageCooldown = PLAYER_DEFAULT_TAKE_DAMAGE_COOLDOWN;

    // server side damage calculation
    if (this.p.isServerSide){
      var dmg = dmgAndShooter.dmg,
          shooterEntityType = dmgAndShooter.shooter.entityType,
          shooterId = dmgAndShooter.shooter.spriteId;
      
      this.p.currentHealth -= dmg;
      
      console.log(this.p.entityType + " " + this.p.spriteId + " took damage by " + shooterEntityType + " \
                  " + shooterId + ". currentHealth = " + this.p.currentHealth);

  
      sendToApp('spriteTookDmg', {
        dmg: dmg,
        victim: {entityType: this.p.entityType, spriteId: this.p.spriteId},
        shooter: {entityType: shooterEntityType, spriteId: shooterId}
      });


      // Only the server decides if the player dies or not
      if(this.p.currentHealth <= 0) {
        this.die(shooterEntityType, shooterId);
      }
    }
  },
  
  die: function(killerEntityType, killerId) {
    this.p.canFire = false;

    var killerName = getSprite(killerEntityType, killerId).p.name;
    
    var vType = this.p.entityType;
    var vId = this.p.spriteId;
    var vCharId = this.p.characterId;
    var vSessionId = this.p.sessionId;

    var killedData = {killerEntityType: killerEntityType, 
                      killerId: killerId,
                      victimEntityType: vType,
                      victimId: vId};

    Q.stageScene(SCENE_KILLED_INFO, STAGE_KILLED_INFO, killedData);


    console.log(this.p.name + " died to " + killerName);
  
    Q.state.trigger("playerDied", {
      victim: {entityType: vType, spriteId: vId}, 
      killer: {entityType: killerEntityType, spriteId: killerId}
    });
    
    if (this.p.isServerSide) {
      
      sendToApp('spriteDied', {
        victim: {entityType: vType, spriteId: vId}, 
        killer: {entityType: killerEntityType, spriteId: killerId}
      });

    } else{

      // client side trigger respan event
      setTimeout(function(){
        Q.input.trigger('respawn', {sessionId: vSessionId, spriteId: vId, characterId: vCharId});
      }, 5000);
    }

    removePlayerSprite(vId);
  },
  
  climbLadder: function(col){
      if(col.obj.isA("Ladder")) { 
        this.p.onLadder = true;
        this.p.ladderX = col.obj.p.x;
      }
  },

  step: function(dt) {
    // stop interval when player can take damage
    if(this.p.takeDamageCooldown <= 0 && this.takeDamageIntervalId != -1){
      clearInterval(this.takeDamageIntervalId);
      this.takeDamageIntervalId = -1;
    }
  
    // Update countdown
    //this.p.updateCountdown -= dt;


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
    }else{
      this.p.gravity = 1;
    }

    if(!this.p.onLadder && this.has('animation')){
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
    

    this.p.onLadder = false;
    this.p.cooldown = Math.max(this.p.cooldown - dt, 0);
    this.p.takeDamageCooldown = Math.max(this.p.takeDamageCooldown - dt, 0);
    this.p.toggleElementCooldown = Math.max(this.p.toggleElementCooldown - dt, 0);

    if (this.p.currentMana < this.p.maxMana) {
      this.p.currentMana += PLAYER_DEFAULT_MANA_REGEN;
    }
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
  fire_right: { frames: [90,91,92,93,94,95,96,97,98,99,100,101,102,103], rate: 1/13, trigger: "fired", loop: false}, 

  take_damage: {frames: [104], rate:1/3, loop:false},

  stand_back: { frames: [7], rate: 1/3 },
  stand_left: { frames: [20], rate: 1/3 },
  stand_front: { frames: [33], rate: 1/3 },
  stand_right: { frames: [46], rate: 1/3 }
});
