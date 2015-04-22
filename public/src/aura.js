"use strict";

// ## Aura constants

var AURA_BOTTOM = ["aura_fire_bottom", "aura_earth_bottom", "aura_light_bottom", "aura_water_bottom"];
var AURA_ULTI = ["aura_fire_ulti", "aura_earth_ulti", "aura_light_ulti", "aura_water_ulti"];
var AURA_ANIMATION ="aura";

var AURA_BOTTOM_ANIMATION_TIME = 0.72;
var AURA_ULTI_ANIMATION_TIME = 1.5;

var AURA_DEPTH = 12;
var AURA_DEFAULT_ELEMENT = 0; // fire

// To be added to player/actor sprite
Q.component('auraEffect', {
  added: function(){
    var entity = this.entity;

    entity.on('inserted', this, 'inserted');
    entity.on('step', this, 'step');
    entity.on('destroyed', this, 'destroyed');
  },
  
  inserted: function(stage){
    var entity = this.entity;

    if(!entity.p.isServerSide){
      // only server creates the aura sprite and update clients
      return;
    }

    if(isSpriteExists("AURA", entity.p.spriteId)){
      // re-create for the player/actor already
      console.log("AURA sprite of "+entity.p.spriteId+" already exists");
      removeSprite("AURA", this.entity.p.spriteId);
      return;
    }

    var aura = new Q.Aura({
        spriteId: entity.p.spriteId
      });

    stage.insert(aura);
  },

  step: function(dt){

    var a = getSprite("AURA", this.entity.p.spriteId);
    var entity = this.entity;

    if(a !== undefined){
      var aW = a.p.w;
      var aH = a.p.h;
      var aX = entity.p.x;
      var aY = entity.p.y + entity.p.h/2 - aH/2;
      a.p.x = a.p.ultiStack ? aX+3 : aX;
      a.p.y = aY;

      a.p.element = entity.p.element;
      var numStacks;
      var playerStack = Q.state.get('playerPermanentBoosts')[entity.p.spriteId];
      if(playerStack){
        numStacks = playerStack.stacks[POWERUP_CLASS_ENEMYDROP_DMGHPMP];        
      }
      a.p.ultiStack = numStacks || 0;
    }
  },

  destroyed: function(){
    var a = getSprite("AURA", this.entity.p.spriteId);
    if(a === undefined){
      console.log("Aura of sprite "+this.entity.p.spriteId+" not found when component auraEffect is destroyed");
      return;
    }
    a.destroy();
  }
});

Q.Sprite.extend("Aura",{

  init: function(p, defaultP) {
    
    var that = this;
    p = Q._defaults(p, defaultP);

    // You can call the parent's constructor with this._super(..)
    this._super(p, {
      spriteId: -1,
      entityType: 'AURA',
      frame : 0,
      sheet: AURA_BOTTOM[AURA_DEFAULT_ELEMENT],
      sprite: AURA_ANIMATION, 
      element: AURA_DEFAULT_ELEMENT,
      type: Q.SPRITE_NONE,
      collisionMask: Q.SPRITE_NONE,
      ultiStack: 0
    });

    this.p.z = AURA_DEPTH;

    this.add('animation');
  },

  step: function(dt){
        
    if(this.p.ultiStack){
      // ulti stack is not empty
      this.p.sheet = AURA_ULTI[this.p.element];
      var rate = this.p.ultiStack ? 1/this.p.ultiStack : 1;
      
      Q.animation(AURA_ANIMATION, 'aura_ulti').rate  = (AURA_ULTI_ANIMATION_TIME/18) * rate; 
      this.play('aura_ulti');
    }else{
      // default aura
      this.p.sheet = AURA_BOTTOM[this.p.element];
      this.play('aura_bottom');
    }
  }
});

Q.animations(AURA_ANIMATION, {
  aura_bottom: { frames: [0,1,2,3,6,7,8,9], rate: AURA_BOTTOM_ANIMATION_TIME/8 },
  aura_ulti: { frames: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], rate: AURA_ULTI_ANIMATION_TIME/18 }
});