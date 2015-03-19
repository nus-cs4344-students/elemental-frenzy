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
var ELEBALL_DEFAULT_ELEMENT = 0; // fire
var ELEBALL_FRAME = 0; // always take the first frame
var ELEBALL_BOUNDINGBOX_SF = 0.5;
var ELEBALL_ANIMATION = "eleball";
var ELEBALL_PLAYER_SF = 0.5;
var ELEBALL_ENEMY_SF = 0.5;

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
			entityType: 'ELEBALL',
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
		
		// Destroy itself after 10 seconds
		var that = this;
		setTimeout(function() {
			that.destroy();
		}, 10000)
		
		// Play fire sound when eleball is launched
		if ( !this.p.soundIsAnnoying) {
			Q.audio.play(ELEBALL_ELEMENTSOUNDS[this.p.element]);
		}
	},

	onHit: function(collision) {
		console.log("onHit");
	},
	
	step: function(dt) {
		this.p.x += this.p.vx * dt;
		this.p.y += this.p.vy * dt;

		this.play("fire");
	}
});

// ## Player Eleball Sprite
Q.Eleball.extend("PlayerEleball", {
	
	init: function(p, defaultP) {
	
		p = mergeObjects(p, defaultP);
		
		this._super(p, {
			entityType: 'PLAYERELEBALL'
		});
		
		this.on('destroyed');
	},
	
	// Player eleballs only damage enemies
	onHit: function(collision) {
		if (collision.obj.isA("Enemy") ||
			(collision.obj.isA("Player") && collision.obj.p.playerId != this.p.shooterId) ||
			collision.obj.isA("Actor")) {
			collision.obj.trigger('takeDamage', {dmg: this.p.dmg, shooter: this.p.shooter});
		}
		this._super(collision);
	},
	
	destroyed: function() {
		if (this.p.isServerSide) {
			if (typeof this.p.id == 'undefined'){
				console.log("getting new id for " + this.p.id);
				this.p.id = getNextId(this.p.sessionId, this.p.entityType);
			}
			console.log(this.p.entityType + " id " + this.p.id + " sending destroyed message with sessionId " + this.p.sessionId);
			socket.emit('destroyed', {
				entityType: 'PLAYERELEBALL',
				sessionId: this.p.sessionId,
				id: this.p.id,
				p: this.p
			});
		}
	}
});

// ## Enemy Eleball Sprite
Q.Eleball.extend("EnemyEleball", {
	
	init: function(p, defaultP) {
	
		p = mergeObjects(p, defaultP);
		
		this._super(p, {
			entityType: 'ENEMYELEBALL',
			dmg : ENEMY_ELEBALL_DEFAULT_DMG,
			collisionMask : Q.SPRITE_ALL ^ Q.SPRITE_ENEMY
		});	
		
		this.on('destroyed');
	},
	
	// Enemy eleballs only damage players
	onHit: function(collision) {
		if (collision.obj.isA("Player") || collision.obj.isA("Actor")) {
			collision.obj.trigger('takeDamage', {dmg: this.p.dmg, shooter: this.p.shooter});
		}
		this._super(collision);
	},
	
	destroyed: function() {
		if (this.p.isServerSide) {
			if (typeof this.p.id == 'undefined'){
				console.log("getting new id for " + this.p.id);
				this.p.id = getNextId(this.p.sessionId, this.p.entityType);
			}
			console.log(this.p.entityType + " id " + this.p.id + " sending destroyed message with sessionId " + this.p.sessionId);
			socket.emit('destroyed', {
				entityType: 'ENEMYELEBALL',
				sessionId: this.p.sessionId,
				id: this.p.id,
				p: this.p
			});
		}
	}
});

Q.animations(ELEBALL_ANIMATION, {
	fire: { frames: [0,1,2,3,4,5], rate: 1/6}
});