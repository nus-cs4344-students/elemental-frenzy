"use strict";

// ## Actor Sprite (other players)
Q.Sprite.extend("Actor", {
	
	init: function(p, defaultP) {
		p = mergeObjects(p, defaultP);
		this._super(p, {
			sheet: "character_water",
			maxHealth: PLAYER_DEFAULT_MAXHEALTH,
			type: Q.SPRITE_ACTIVE,
			update: true
		});
		
		this.add('2d, healthBar, nameBar, dmgDisplay');
		
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
	},
	
	draw: function(ctx) {
		this._super(ctx);
		this.healthBar.draw(ctx);
		this.nameBar.draw(ctx);
		this.dmgDisplay.draw(ctx);
	}
});