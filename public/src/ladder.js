"use strict";

// ## Ladder Sprite
// Ladder sprite to enable players to climb
Q.Sprite.extend("Ladder", {
  init: function(p) {	
    this._super(p, { 
      sheet: 'ladder_wood',
      type: Q.SPRITE_DEFAULT,
      collisonMask: Q.SPRITE_ACTIVE,
      sensor: true
    });

    this.add('2dLadder');
  }
});
