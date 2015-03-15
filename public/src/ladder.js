"use strict";

// ## Ladder Sprite
// Ladder sprite to enable players to climb
Q.Sprite.extend("Ladder", {
  init: function(p, defaultP) {
    p = mergeObjects(p, defaultP);
    
      this._super(p, { sheet : 'ladder_wood',
                       type : Q.SPRITE_ACTIVE
    
    });    
  }
});
