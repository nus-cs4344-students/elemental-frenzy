"use strict";

// ## Enemy constants
var ENEMY_DEFAULT_MAXHEALTH = 50;
var ENEMY_DEFAULT_COOLDOWN = 1.0;
var ENEMY_DEFAULT_DMG = 2;
var ENEMY_ELEBALL_DEFAULT_DMG = 5;
var ENEMY_DEFAULT_ELEMENT = 0; // fire

// ## Enemy Sprite
// Create the Enemy class to add in some baddies
Q.Sprite.extend("Enemy",{
	
  init: function(p) {
    this._super(p, { 
		sheet: 'enemy', 
		vx: 100,  
		type: Q.SPRITE_ENEMY,
		collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_PARTICLE ^ Q.SPRITE_ENEMY,
		shootRandomly: true,	// make enemy shoot randomly if true
		cooldown: 0,			// enemy has a cooldown as well
		dmg: ENEMY_DEFAULT_DMG,
		element: ENEMY_DEFAULT_ELEMENT,
		currentHealth: ENEMY_DEFAULT_MAXHEALTH,
		maxHealth: ENEMY_DEFAULT_MAXHEALTH,
		name: 'enemyAi'
	});

    // Enemies use the Bounce AI to change direction 
    // whenver they run into something.
    this.add('2d, aiBounce, healthBar, dmgDisplay');

    // Listen for a sprite collision, if it's the player,
    // end the game unless the enemy is hit on top
    this.on("bump.left,bump.right,bump.bottom",function(collision) {
      if(collision.obj.isA("Player")) { 
		collision.obj.takeDamage(this.p.dmg, this.p.name);
      }
    });

    // If the enemy gets hit on the top, destroy it
    // and give the user a "hop"
    this.on("bump.top",function(collision) {
      if(collision.obj.isA("Player")) { 
        this.takeDamage(collision.obj.p.dmg, collision.obj.p.name);
        collision.obj.p.vy = -300;
      }
    });
	
  },
  
	takeDamage: function(dmg, shooter) {
		this.p.currentHealth -= dmg;
		this.dmgDisplay.addDmg(dmg);
		if (this.p.currentHealth <= 0) {
			Q.state.trigger("enemyDied", shooter);
			this.destroy();
		}
	},
  
	step: function(dt) {
		this.dmgDisplay.step(dt);
		// Randomly change elements
		if (Math.random() > 0.5) {
			this.p.element = ELEBALL_ELEMENT_WATER;
		} else {
			this.p.element = ELEBALL_ELEMENT_FIRE;
		}
		// Make enemies shoot randomly
		if (this.p.shootRandomly) {
			this.p.cooldown -= dt;
			if (this.p.cooldown <= 0) {
				this.p.cooldown = 0;
			}
			
			if (this.p.cooldown <= 0) {
				//ready to shoot
				
				var enemyEleball = new Q.EnemyEleball({
					element : this.p.element,
					sheet : ELEBALL_ELEMENTNAMES[this.p.element],
					soundIsAnnoying : true,
					shooter : this.p.name
				});
				enemyEleball.p.x = this.p.x - this.p.w/10 - enemyEleball.p.w/2;
				enemyEleball.p.y = this.p.y;
				
				//randomly choose a direction to shoot
				if (Math.random() > 0.5) {
					enemyEleball.p.vx = ELEBALL_DEFAULT_VX;
				} else {
					enemyEleball.p.vx = -ELEBALL_DEFAULT_VX;
				}
				
				Q.stage().insert(enemyEleball);
				
				// randomly set a cooldown between 2.0 and 5.0
				this.p.cooldown = Math.random() * 3 + ENEMY_DEFAULT_COOLDOWN; }
		}
	},
	
	draw: function(ctx) {
		this._super(ctx);
		this.healthBar.draw(ctx);
		this.dmgDisplay.draw(ctx);
	}
});