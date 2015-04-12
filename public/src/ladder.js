"use strict";

// ## Ladder Sprite
// Ladder sprite to enable players to climb
Q.Sprite.extend("Ladder", {
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


// To be added to player/actor/ladder sprite
Q.component('2dLadder', {
  added: function(){  
    var entity = this.entity;
    Q._defaults(entity.p,{
      type: Q.SPRITE_UI,             // ladder is ui element
      collisionMask: Q.SPRITE_ACTIVE // ladder only collides with player
    });
    entity.on('hit',this,"collision");
  },

  collision: function(col,last) {
    // only when player collide with ladder, then player will trigger 'onLadder'
    if(col.obj.isA("Ladder")){
      var entity = this.entity;
      entity.trigger("onLadder", col);
    }
  }
});

// To be added to stage
Q.component('ladderSystem',{
  added: function(){
    // Get random spawn position
    var tileLayer = this.entity._collisionLayers[0];
    var randomLadderPaths = tileLayer.getVerticalTileToTileEmptyPaths(3);
    var MARGIN = 0.1 * tileLayer.p.w; // 10% away from the left/right gameworld edges


    var maxLadderCount = 2;
    var ladderCount = 0;
    var ladderW = tileLayer.p.tileW;
    var ladderH = tileLayer.p.tileH;

    for(var i in randomLadderPaths){
      if(i >= maxLadderCount){
        break;
      }

      var path = randomLadderPaths[i];
      if(path.x <= MARGIN || path.x >= (tileLayer.p.w - MARGIN)){
        // avoid spawning ladder at the corners of the game world
        continue;
      }

      // for loop for inserting one ladder
      for(var p in path){
        var x = path[p].x;
        var y = path[p].y;

        console.log("Insert ladder at "+x+" "+y);
        
        // Creates ladder
        var ladder = new Q.Ladder({
            name: 'ladder_'+ladderCount,
            spriteId: getNextSpriteId(),
            x: Math.floor(x-ladderW/2), 
            y: Math.floor(y-ladderH/2)
          });

        // Insert the ladder
        this.entity.insert(ladder);
      }

      ladderCount++;
    }
  }
});