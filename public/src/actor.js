"use strict";

// ## Actor constants
var ACTOR_ANIMATION = 'actor';

// ## Actor Sprite (other players)
Q.Sprite.extend("Actor", {
	
	init: function(p, defaultP) {
		p = mergeObjects(p, defaultP);
		this._super(p, {
			maxHealth: PLAYER_DEFAULT_MAXHEALTH,
			type: Q.SPRITE_ACTIVE,
			update: true
		});
		
		this.add('healthBar, nameBar, dmgDisplay');
		
		var temp = this;
		setInterval(function() {
			if (!temp.p.update) {
				temp.destroy();
			}
			temp.p.update = false;
		}, 3000);
	},
	
	takeDamage: function(dmg) {
		this.p.currentHealth -= dmg;
		this.dmgDisplay.addDmg(dmg);
	},
	
	step: function(dt) {
		this.dmgDisplay.step(dt);

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
		this.healthBar.draw(ctx);
		this.nameBar.draw(ctx);
		this.dmgDisplay.draw(ctx);
	}
});

Q.animations(ACTOR_ANIMATION, {
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