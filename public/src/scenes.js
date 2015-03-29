"use strict";

// ## So that viewport can be centered on the player
var characterSelected;
var sessionSelected;
var isSelectedSessionFull;
var isSelectedCharacterInUse;
var lightGrey = "#CCCCCC";
var darkGrey = "rgba(0,0,0,0.5)";

// welcome screen to allow player to choose characterSprites
Q.scene('welcomeScreen',function(stage) {

  if(sessionSelected && !sessions[sessionSelected]){
    sessionSelected = undefined;
  }


  var title = stage.insert(new Q.UI.Text({  x:Q.width/2,
                                            y:Q.height/20,
                                            size: 50,
                                            align: 'center',
                                            color: 'red',
                                            label: "Elemental Frenzy"
                                          }));

  // join button
  var isShow = !isSelectedSessionFull && sessionSelected && !isSelectedCharacterInUse && characterSelected;
  var buttonJoin = stage.insert(new Q.UI.Button({ fill: darkGrey,
                                                  opacity: isShow ? 1 : 0,
                                                  x: Q.width/2,
                                                  y: 11*Q.height/13,
                                                  w: 80,
                                                  h: 35,
                                                  label: 'Join',
                                                  font: '800 18px Arial',
                                                  fontColor: 'black'
                                                }));

  buttonJoin.on("click", function() {
    if(!isSelectedSessionFull && sessionSelected && characterSelected && !isCharacterInUse(characterSelected)){
      Q.input.trigger('join', {sessionId: sessionSelected, characterId: characterSelected});
    }
  });

  

  var isCharacterInUse = function(cId){
    var isSessionSelected = Boolean(sessionSelected);
    var hasCharacterInUse = isSessionSelected && Boolean(charactersInUse[sessionSelected]);
    return hasCharacterInUse && Boolean(charactersInUse[sessionSelected][cId]);
  };


  var updateCharacterSprites = function(){
    console.log('charac usage: '+JSON.stringify(charactersInUse,null,4));
    console.log("session selected "+sessionSelected);
    console.log("character Selected : "+characterSelected);
    for(var c in characterSprites){

      var cs = characterSprites[c];console.log("char "+cs.p.characterId+" -> "+isCharacterInUse(cs.p.characterId));
      if(isCharacterInUse(cs.p.characterId)){
        cs.p.frame = 7;
        cs.p.playAnim = 'run_in';
      }else{
        cs.p.frame = 33;
        cs.p.playAnim = 'run_out';
      }

      // play animation for character sprites
      if(!cs.has('animation')){
        cs.add('animation');
      }

      cs.play(cs.p.playAnim);
    }
  };

  // session selection section
  var sessionsSection = stage.insert(new Q.UI.Container({ x: Q.width/2, 
                                                          y: 7*Q.height/11,
                                                          w: 2*Q.width/3,
                                                          h: Q.height/3,
                                                          fill: darkGrey
                                                        }));

  var offsetY = 25;
  var sessionSprites = {};
  var charactersInUse = {};
  var numSession = 0;console.log("sessions : "+JSON.stringify(sessions,null,4));
  for(var s in sessions){
    // session sprites
    var sInfo = sessions[s];
    var sLabel = "[ "+sInfo.playerCount+"/"+sInfo.playerMaxCount+" ] Session "+sInfo.sessionId;
    var isFull = sInfo.playerCount >= sInfo.playerMaxCount;

    var pList = sInfo.players;
    for(var p in pList){
      
      if(!charactersInUse[sInfo.sessionId]) {
        charactersInUse[sInfo.sessionId] = {};
      }

      charactersInUse[sInfo.sessionId][pList[p]] = p;
    }

    var sSprite = new Q.UI.Button({ fill: sessionSelected == sInfo.sessionId ? lightGrey : null,
                                    x: 0,
                                    y: numSession*offsetY,
                                    w: 3*sessionsSection.p.w/5,
                                    h: 1*sessionsSection.p.h/9,
                                    label: sLabel,
                                    font: '400 14px Arial',
                                    fontColor:  isFull ? 'red' : 'black',
                                    sessionId: sInfo.sessionId,
                                    isFull: isFull
                                  });
    sessionSprites[numSession] = sSprite;
    numSession++;
  }

  // please choose a session
  var choiceSession = stage.insert(new Q.UI.Text({x:sessionsSection.p.x,
                                                  y:sessionsSection.p.y - 3*sessionsSection.p.h/7,
                                                  size: 18,
                                                  align: 'center',
                                                  color: 'black',
                                                  label: "Please choose a session to join"
                                                }));
 

  // insert session into container
  var container_session = stage.insert(new Q.UI.Container({ x: sessionsSection.p.x, 
                                                            y: sessionsSection.p.y - 2*sessionsSection.p.h/11, 
                                                          }));

  for(var s in sessionSprites){
    container_session.insert(sessionSprites[s]);
  }

  // no session available for players to connect to
  if(numSession <= 0){
    container_session.insert(new Q.UI.Button({fill: null,
                                              x: 0,
                                              y: 0,
                                              w: 3*sessionsSection.p.w/5,
                                              h: 1*sessionsSection.p.h/9,
                                              label: 'No session is avaiable at the moment',
                                              font: '400 14px Arial',
                                              fontColor: 'black',
                                              buttonId: numSession
                                            }));
  }

  sessionsSection.fit(20,20);



  // characterSprites selection section
  var characterSection = stage.insert(new Q.UI.Container({x: Q.width/2, 
                                                          y: Q.height/3,
                                                          w: 2*Q.width/3,
                                                          h: 150,
                                                          fill: darkGrey
                                                        }));

  var characterSprites = {};
  var nameSprites = {};
  var numChar = 0;
  var offsetX = 70;console.log("character in use : "+JSON.stringify(charactersInUse,null,4));
  for(var c in PLAYER_CHARACTERS){

    // characterSprites sprites
    var isSelected = characterSelected == c;
    var cSprite = new Q.UI.Button({ sheet: PLAYER_CHARACTERS[c],
                                    sprite: PLAYER_ANIMATION,
                                    x: 0,
                                    y: 0,
                                    fill: isSelected ? lightGrey : null,
                                    characterId: c
                                  });
    characterSprites[numChar] = cSprite;
    updateCharacterSprites();

    // characterSprites nameSpritesSprites
    nameSprites[numChar] = new Q.UI.Text({ x:0,
                                    y:40,
                                    size: 12,
                                    align: 'center',
                                    color: PLAYER_NAME_COLORS[numChar],
                                    label: PLAYER_NAMES[numChar]
                                  });
    numChar++;
  }


  // please choose your characterSprites
  var choicecharacterSprites = stage.insert(new Q.UI.Text({x:characterSection.p.x,
                                                    y:characterSection.p.y - 2*characterSection.p.h/5,
                                                    size: 18,
                                                    align: 'center',
                                                    color: 'black',
                                                    label: "Please choose your character"
                                                  }));

  // insert characterSprites and nameSprites into container
  var nChar = 0;
  var container_char_name;
  for(var c in nameSprites){
    container_char_name = stage.insert(new Q.UI.Container({ x: characterSection.p.x - (numChar-1)*offsetX/2 + nChar*offsetX, 
                                                            y: characterSection.p.y, 
                                                    }));
    container_char_name.insert(characterSprites[nChar]);
    container_char_name.insert(nameSprites[nChar]);
    
    nChar++;
  }


  // sessionSprites listener
  for(var s in sessionSprites){
    
    sessionSprites[s].on("click", function() {  

      if(this.p.fill){
        this.p.fill = null;
        sessionSelected = undefined;
        isSelectedSessionFull = false;

      }else{
        this.p.fill = lightGrey;
        sessionSelected = this.p.sessionId;
        isSelectedSessionFull = this.p.isFull;

        // reset others
        for(var o in sessionSprites){
          if(sessionSprites[o].p.sessionId != this.p.sessionId){
            sessionSprites[o].p.fill = null;
          }
        }
      }

      // update availability of character sprites
      updateCharacterSprites();

      // show join button if both character and session are selected
      if(!isSelectedSessionFull && sessionSelected && characterSelected && !isCharacterInUse(characterSelected)){
        buttonJoin.p.opacity = 1;
      }else{
        buttonJoin.p.opacity = 0;
      }
    });
  }


  // characterSprites listener
  for(var c in characterSprites){
    
    characterSprites[c].on("click", function() {  

      if(this.p.fill){
        this.p.fill = null;
        characterSelected = undefined;
        isSelectedCharacterInUse = false;

      }else{
        this.p.fill = lightGrey;
        characterSelected = this.p.characterId;

        if(isCharacterInUse(this.p.characterId)){
         isSelectedCharacterInUse = true;
        }
        // reset others
        for(var o in characterSprites){
          if(characterSprites[o].p.characterId != this.p.characterId){
            characterSprites[o].p.fill = null;
          }
        }
      }

      // show join button if both character and session are selected
      if(!isSelectedSessionFull && sessionSelected && characterSelected && !isCharacterInUse(characterSelected)){
        buttonJoin.p.opacity = 1;
      }else{
        buttonJoin.p.opacity = 0;
      }
    });
  }

  characterSection.fit(20,20);
});

// To display a game over / game won popup box, 
// create a endGame scene that takes in a `label` option
// to control the displayed message.
Q.scene('endGame',function(stage) {
  
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: darkGrey
  }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                  label: "Play Again" }))         
  var label = container.insert(new Q.UI.Text({x:10, y: -10 - button.p.h, 
                                                   label: stage.options.label }));
  // When the button is clicked, clear all the stages
  // and restart the game.
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene(gameState.level);
  });

  // Expand the container to visibily fit it's contents
  // (with a padding of 20 pixels)
  container.fit(20);
});

// create background screen
Q.scene("background",function(stage) {

  // Add in a repeater for a little parallax action
  stage.insert(new Q.Repeater({ asset: "background-wall.png", 
                                speedX: 0.5, 
                                speedY: 0.5 })
  );
});

// ## Level1 scene
// Create a new scene called level 1
Q.scene("level1",function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level1.json',
                                            sheet: 'tiles' })
  );
});

// ## Level2 scene
// Create a new scene called level 2
Q.scene("level2",function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level2.json',
                                            sheet: 'tiles' })
  );
});

// ## Level3 scene
// Create a new scene called level 3
Q.scene("level3",function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level3.json',
                                            sheet: 'tiles' })
  );
});