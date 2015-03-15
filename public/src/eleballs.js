"use strict";

require(['src/helper-functions']);

// ## Eleball constants
var ELEBALL_DEFAULT_VX = 150;
var ELEBALL_DEFAULT_VY = 150;
var ELEBALL_DEFAULT_DMG = 5;
// Element indices (0: fire, 1: earth, 2: lightning, 3: water, 0 > 1 > 2 > 3 > 0)
var ELEBALL_ELEMENT_FIRE = 0;
var ELEBALL_ELEMENT_EARTH = 1;
var ELEBALL_ELEMENT_LIGHTNING = 2;
var ELEBALL_ELEMENT_WATER = 3;
var ELEBALL_ELEMENTNAMES = ["element_fire", "element_earth", "element_lightning", "element_water"];
// TODO Change the sound files once they are ready
var ELEBALL_ELEMENTSOUNDS = ["fireBall.ogg", "earthBall.ogg", "lightningBall.ogg", "waterBall.ogg"];
var ELEBALL_DEFAULT_ELEMENT = 0; // water
var ELEBALL_FRAME = 0; // always take the first frame
var ELEBALL_BOUNDINGBOX_SF = 0.5;
var ELEBALL_ANIMATION = "eleball";
var ELEBALL_PLAYER_SF = 0.5;

// Load element sounds
for (var i = 0; i < ELEBALL_ELEMENTSOUNDS.length; i++) {
	Q.load(ELEBALL_ELEMENTSOUNDS[i]);
}

// ## Own Eleball Sprite
Q.Sprite.extend("Eleball", {
	
	init: function(p, defaultP) {
		// merge p and defaultP, where attributes in p will override those in defaultP
		p = mergeObjects(p, defaultP);
		
		this._super(p, {
			element : ELEBALL_DEFAULT_ELEMENT,
			sheet : ELEBALL_ELEMENTNAMES[ELEBALL_DEFAULT_ELEMENT],
			sprite : ELEBALL_ANIMATION,
			frame : 0,
			soundIsAnnoying : false,
			vx : 0,
			vy : 0,
			scale : 0.9,
			x : 0,
			y : 0,
			dmg : ELEBALL_DEFAULT_DMG,
			shooter : "..no_name..",
			type : Q.SPRITE_PARTICLE,
			collisionMask : Q.SPRITE_ALL
		});	

		// Set bounding box smaller
		this.p.points = makeScaledPoints(this.p.w, this.p.h, ELEBALL_BOUNDINGBOX_SF);

		this.add("2dEleball, animation");
		
		this.on("onHit", this, "onHit");
		
		// Play fire sound when eleball is launched
		if ( !this.p.soundIsAnnoying) {
			Q.audio.play(ELEBALL_ELEMENTSOUNDS[this.p.element]);
		}

		this.play("fire");
	},

	onHit: function(collision) {
		console.log("onHit");
	},
	
	step: function(dt) {
		this.p.x += this.p.vx * dt;
		this.p.y += this.p.vy * dt;
	}
});

// ## Player Eleball Sprite
Q.Eleball.extend("PlayerEleball", {
	
	init: function(p, defaultP) {
	
		p = mergeObjects(p, defaultP);
		
		this._super(p);
	},
	
	// Player eleballs only damage enemies
	onHit: function(collision) {
		if (collision.obj.isA("Enemy") ||
			(collision.obj.isA("Player") && collision.obj.p.playerId != this.p.shooterId)) {
			collision.obj.trigger('takeDamage', this.p.dmg, this.p.shooter);
		}
		this._super(collision);
	}
});

// ## Enemy Eleball Sprite
Q.Eleball.extend("EnemyEleball", {
	
	init: function(p, defaultP) {
	
		p = mergeObjects(p, defaultP);
		
		this._super(p, {
			dmg : ENEMY_ELEBALL_DEFAULT_DMG,
			collisionMask : Q.SPRITE_ALL ^ Q.SPRITE_ENEMY
		});	
	},
	
	// Enemy eleballs only damage players
	onHit: function(collision) {
		if (collision.obj.isA("Player")) {
			collision.obj.takeDamage(this.p.dmg, this.p.shooter);
		}
		this._super(collision);
	}
});

Q.animations(ELEBALL_ANIMATION, {
	fire: { frames: [0,1,2,3,4,5], rate: 1/6}
});