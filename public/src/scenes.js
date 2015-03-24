"use strict";

// ## So that viewport can be centered on the player
var player;

// ## Level1 scene
// Create a new scene called level 1
Q.scene("level1",function(stage) {

	// Add in a repeater for a little parallax action
	stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

		// Add in a tile layer, and make it the collision layer
		stage.collisionLayer(new Q.TileLayer({
								dataAsset: 'level1.json',
		                        sheet:     'tiles' }));


		player = Q.stage().insert(new Q.Player({
			playerId: selfId
	}));
		
	// Give the stage a moveable viewport and tell it
	// to follow the player.
	Q.stage().add("viewport").follow(player);

	// Add in a couple of enemies
	stage.insert(new Q.Enemy({ x: 700, y: 0 }));
	stage.insert(new Q.Enemy({ x: 800, y: 0 }));

	// Finally add in the tower goal
	stage.insert(new Q.Tower({ x: 180, y: 50 }));
  
	// Insert all actors
	require(['src/helper-functions'], insertAllActors(stage));
});

// ## Level2 scene
// Create a new scene called level 2
Q.scene("level2",function(stage) {

	// Add in a repeater for a little parallax action
	stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

		// Add in a tile layer, and make it the collision layer
		stage.collisionLayer(new Q.TileLayer({
		                     dataAsset: 'level2.json',
		                     sheet:     'tiles' }));


		player = Q.stage().insert(new Q.Player({
		playerId: selfId
	}));

	// Give the stage a moveable viewport and tell it
	// to follow the player.
	Q.stage().add("viewport").follow(player);

	// Add in a couple of enemies
	stage.insert(new Q.Enemy({ x: 700, y: 0 }));
	stage.insert(new Q.Enemy({ x: 800, y: 0 }));

	// Finally add in the tower goal
	stage.insert(new Q.Tower({ x: 180, y: 50 }));

	// Insert all actors
	require(['src/helper-functions'], insertAllActors(stage));
});

// ## Level3 scene
// Create a new scene called level 3
Q.scene("level3",function(stage) {

	// Add in a repeater for a little parallax action
	stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

		// Add in a tile layer, and make it the collision layer
		stage.collisionLayer(new Q.TileLayer({
		                     dataAsset: 'level3.json',
		                     sheet:     'map_tiles' }));


		player = Q.stage().insert(new Q.Player({
		playerId: selfId
	}));

	// Give the stage a moveable viewport and tell it
	// to follow the player.
	Q.stage().add("viewport").follow(player);

	// Add in a couple of enemies
	stage.insert(new Q.Enemy({ x: 700, y: 0 }));
	stage.insert(new Q.Enemy({ x: 800, y: 0 }));

	// Finally add in the tower goal
	stage.insert(new Q.Tower({ x: 180, y: 50 }));

    stage.insert(new Q.TileLayer({ dataAsset: 'level3.json',
                                    sheet: 'map_tiles'}));
//  stage.insert(new Q.Ladder({ x: 100, y: 133 }));
//  stage.insert(new Q.Ladder({ x: 100, y: 196 }));
//  stage.insert(new Q.Ladder({ x: 100, y: 259 }));
//  stage.insert(new Q.Ladder({ x: 100, y: 322 }));
//  stage.insert(new Q.Ladder({ x: 100, y: 385 }));

	// Insert all actors
	insertAllActors(stage);
});

// To display a game over / game won popup box, 
// create a endGame scene that takes in a `label` option
// to control the displayed message.
Q.scene('endGame',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
  }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                  label: "Play Again" }))         
  var label = container.insert(new Q.UI.Text({x:10, y: -10 - button.p.h, 
                                                   label: stage.options.label }));
  // When the button is clicked, clear all the stages
  // and restart the game.
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene('level3');
  });

  // Expand the container to visibily fit it's contents
  // (with a padding of 20 pixels)
  container.fit(20);
});