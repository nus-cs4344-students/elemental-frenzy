"use strict";

// ## Power up sprite
// Power up for players to increase damage, recover HP / MP
Q.Sprite.extend("PowerUp", {
  init: function(p, defaultP) {
    this._super(p, { 
      sheet: 'ladder_metal',
      type: Q.SPRITE_DEFAULT,
      collisonMask: Q.SPRITE_ACTIVE,
      sensor: true
    });

    this.add('2dLadder');
  }
});
