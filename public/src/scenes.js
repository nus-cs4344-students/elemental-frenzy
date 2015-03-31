"use strict";


// ## Stage constants (higher number will render OVER lower number)
var STAGE_BACKGROUND = 0;
var SCENE_BACKGROUND = 'background';
var STAGE_LEVEL = 1;
var STAGE_WELCOME = 2;
var SCENE_WELCOME = 'welcomeScreen';
var STAGE_SCORE = 3;
var SCENE_SCORE = 'scoreScreen';
var STAGE_KILLED_INFO = 4;
var SCENE_KILLED_INFO = 'killedScreen';
var STAGE_HUD = 5;


// ## UI constants
var UI_OVERLAY_ALPHA_VALUE = 0.3;
var UI_TEXT_ALPHA_VALUE = 0.7;
var UI_PADDING_VALUE = 20; //in pixels
var LIGHT_GREY = "#CCCCCC";
var DARK_GREY = "rgba(0,0,0,0.5)";


var welcomeCharSelected;
var welcomeSessionSelected;
var isWelcomeSelectedSessionFull;
var isWelcomeSelectedCharInUse;

var killedInfo = [];
var killedInfoTimeLeft= [];
var killedInfoPosition = [];

// welcome screen to allow player to choose characterSprites
Q.scene(SCENE_WELCOME,function(stage) {

  if(welcomeSessionSelected && !sessions[welcomeSessionSelected]){
    welcomeSessionSelected = undefined;
  }


  var title = stage.insert(new Q.UI.Text({  x:Q.width/2,
                                            y:Q.height/20,
                                            size: 50,
                                            align: 'center',
                                            color: 'red',
                                            label: "Elemental Frenzy"
                                          }));

  // join button
  var isShow = !isWelcomeSelectedSessionFull && welcomeSessionSelected && !isWelcomeSelectedCharInUse && welcomeCharSelected;
  var buttonJoin = stage.insert(new Q.UI.Button({ fill: DARK_GREY,
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
    if(!isWelcomeSelectedSessionFull && welcomeSessionSelected && welcomeCharSelected && !isCharacterInUse(welcomeCharSelected)){
      Q.input.trigger('join', {sessionId: welcomeSessionSelected, characterId: welcomeCharSelected});
    }
  });

  

  var isCharacterInUse = function(cId){
    var iswelcomeSessionSelected = Boolean(welcomeSessionSelected);
    var hasCharacterInUse = iswelcomeSessionSelected && Boolean(charactersInUse[welcomeSessionSelected]);
    return hasCharacterInUse && Boolean(charactersInUse[welcomeSessionSelected][cId]);
  };


  var updateCharacterSprites = function(){
    // console.log('charac usage: '+JSON.stringify(charactersInUse,null,4));
    // console.log("session selected "+welcomeSessionSelected);
    // console.log("character Selected : "+welcomeCharSelected);
    for(var c in characterSprites){

      var cs = characterSprites[c];
      // console.log("char "+cs.p.characterId+" -> "+isCharacterInUse(cs.p.characterId));

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
                                                          fill: DARK_GREY
                                                        }));

  var offsetY = 25;
  var sessionSprites = {};
  var charactersInUse = {};
  var numSession = 0;

  // console.log("sessions : "+JSON.stringify(sessions,null,4));
  
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

    var sSprite = new Q.UI.Button({ fill: welcomeSessionSelected == sInfo.sessionId ? LIGHT_GREY : null,
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

  sessionsSection.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);



  // characterSprites selection section
  var characterSection = stage.insert(new Q.UI.Container({x: Q.width/2, 
                                                          y: Q.height/3,
                                                          w: 2*Q.width/3,
                                                          h: 150,
                                                          fill: DARK_GREY
                                                        }));

  var characterSprites = {};
  var nameSprites = {};
  var numChar = 0;
  var offsetX = 70;
  // console.log("character in use : "+JSON.stringify(charactersInUse,null,4));
  for(var c in PLAYER_CHARACTERS){

    // characterSprites sprites
    var isSelected = welcomeCharSelected == c;
    var cSprite = new Q.UI.Button({ sheet: PLAYER_CHARACTERS[c],
                                    sprite: PLAYER_ANIMATION,
                                    x: 0,
                                    y: 0,
                                    fill: isSelected ? LIGHT_GREY : null,
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
        welcomeSessionSelected = undefined;
        isWelcomeSelectedSessionFull = false;

      }else{
        this.p.fill = LIGHT_GREY;
        welcomeSessionSelected = this.p.sessionId;
        isWelcomeSelectedSessionFull = this.p.isFull;

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
      if(!isWelcomeSelectedSessionFull && welcomeSessionSelected && welcomeCharSelected && !isCharacterInUse(welcomeCharSelected)){
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
        welcomeCharSelected = undefined;
        isWelcomeSelectedCharInUse = false;

      }else{
        this.p.fill = LIGHT_GREY;
        welcomeCharSelected = this.p.characterId;

        if(isCharacterInUse(this.p.characterId)){
         isWelcomeSelectedCharInUse = true;
        }
        // reset others
        for(var o in characterSprites){
          if(characterSprites[o].p.characterId != this.p.characterId){
            characterSprites[o].p.fill = null;
          }
        }
      }

      // show join button if both character and session are selected
      if(!isWelcomeSelectedSessionFull && welcomeSessionSelected && welcomeCharSelected && !isCharacterInUse(welcomeCharSelected)){
        buttonJoin.p.opacity = 1;
      }else{
        buttonJoin.p.opacity = 0;
      }
    });
  }

  characterSection.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
});


// create background screen
Q.scene(SCENE_BACKGROUND,function(stage) {

  // Add in a repeater for a little parallax action
  stage.insert(new Q.Repeater({ asset: "background-wall.png", 
                                speedX: 0.5, 
                                speedY: 0.5 })
  );
});

// ## Level1 scene
// Create a new scene called level 1
Q.scene('level1',function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level1.json',
                                            sheet: 'tiles' })
  );
});

// ## Level2 scene
// Create a new scene called level 2
Q.scene('level2',function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level2.json',
                                            sheet: 'tiles' })
  );
});

// ## Level3 scene
// Create a new scene called level 3
Q.scene('level3',function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level3.json',
                                            sheet: 'tiles' })
  );
});

Q.scene(SCENE_KILLED_INFO ,function(stage) {
  var kType = stage.options.killerEntityType;
  var kId = stage.options.killerId;
  var vType = stage.options.victimEntityType;
  var vId = stage.options.victimId;

  var msg;
  if(kType && kId && vType && vId){
    if(!isSession){
      // client side
      msg = "You are killed by "+getSprite(kType,kId).p.name;
    }else{
      // session side
      msg = vType+" "+vId+" '"+getSprite(vType,vId).p.name+"' \
            is killed by "+kType+" "+kId+" '"+getSprite(kType,kId).p.name+"'";
    }
  }else{
    console.log("Insufficient killed info : "+getJSON(stage.options));
    return;
  }

  killedInfo.push(msg);
  killedInfoTimeLeft.push(3); // display for 3 second
  killedInfoPosition.push([0, Q.height/4]); // starting position of the display is on the right of the entity

  var kInfo = stage.insert(new Q.UI.Text({x: Q.width/2,
                                          y: Q.height/4
                                          size: 20,
                                          align: 'center',
                                          color: 'black',
                                          label: " ",
                                          vx: 0,
                                          vy: -0.5
                                        }));

  kInfo.on('step', kInfo, function(dt){
    for (var i = 0; i < killedInfoTimeLeft.length; i++) {
      killedInfoTimeLeft[i] -= dt;
      if (killedInfoTimeLeft[i] <= 0) {
        // No need to display anymore, so remove it
        killedInfoTimeLeft.splice(i, 1);
        killedInfo.splice(i, 1);
        killedInfoPosition.splice(i, 1);
        this.destroy();
      } else {
        // Need to display, so shift by vx, vy
        killedInfoPosition[i][0] += this.p.vx;
        killedInfoPosition[i][1] += this.p.vy;
      }
    }
  });

  kInfo.on('draw', kInfo, function(ctx) {
    ctx.font = this.p.font || "20px Arial";
    ctx.textAlign = this.p.align || "center";
    ctx.fillStyle = this.p.color || 'red';

    for (var i = 0; i < killedInfo.length; i++) {
      ctx.fillText( killedInfo[i], 
                    killedInfoPosition[i][0], 
                    killedInfoPosition[i][1]);
    }
  });
});

Q.scene(SCENE_SCORE, function(stage) {
  //every line takes about 30 pixels
  var offsetY = 30;

  /*
  ** Set up UI containers
  */
  var overlayContainer = stage.insert(new Q.UI.Container({
      fill: "rgba(1,1,1,"+UI_OVERLAY_ALPHA_VALUE+")",
      border: 5,
      //x, y coordinates here are relative to canvas and top left = (0,0)
      x: Q.width/2,
      y: Q.height/5
    }));
  
  var nameContainer = stage.insert(new Q.UI.Container({ 
        label: "PLAYER NAME",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to canvas, top left = (0,0)
        x: 1*Q.width/12,
        y: Q.height/5
      }));

  var killsContainer = stage.insert(new Q.UI.Container({ 
        //x, y coordinates here are relative to canvas, top left = (0,0)
        x: 7*Q.width/12,
        y: Q.height/5
      }));

  var deathsContainer = stage.insert(new Q.UI.Container({ 
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to canvas, top left = (0,0)
        x: 9*Q.width/12,
        y: Q.height/5
      }));

  /*
  ** Set up Titles
  */

  // placeholder to set up the overlay
  stage.insert(new Q.UI.Text({ 
        //invisible placeholder
        label: "i",
        color: "rgba(1,1,1,0)",
        x: 0,
        y: 0,
        align: "center"
      }), overlayContainer);

  var nameTitle = stage.insert(new Q.UI.Text({ 
        label: "PLAYER NAME",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: 0,
        align: "left"
      }), nameContainer);

  var killsTitle = stage.insert(new Q.UI.Text({ 
        label: "KILLS",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: 0,
        align: "left"
      }), killsContainer);
  

  var deathsTitle = stage.insert(new Q.UI.Text({ 
        label: "DEATHS",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: 0,
        align: "left"
      }), deathsContainer);


  /*
  ** Loop through total number of players and add their scores line by line
  */
  var kills = Q.state.p.kills;
  var deaths = Q.state.p.deaths;
  
  var line = 1;
  for (var name in kills) {

    if (typeof Q.state.p.deaths[name] === 'undefined' || typeof Q.state.p.kills[name] === 'undefined') {
        continue;
      }

    stage.insert(new Q.UI.Text({
        //invisible placeholder
        label: "i",
        color: "rgba(1,1,1,0)",
        x: 0,
        y: line*offsetY,
        align: "center"
      }), overlayContainer);

    stage.insert(new Q.UI.Text({ 
        label: name,
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: line*offsetY,
        align: "left"
      }), nameContainer);

      stage.insert(new Q.UI.Text({ 
        label: kills[name].toString(),
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: line*offsetY,
        align: "left"
      }), killsContainer);

      stage.insert(new Q.UI.Text({ 
        label: deaths[name].toString(),
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: line*offsetY,
        align: "left"
      }), deathsContainer);

      ++line;
  }
  
  //padding between stuff in container and border of container
  overlayContainer.fit(UI_PADDING_VALUE, 5*Q.width/12 + UI_PADDING_VALUE);
  nameContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  killsContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  deathsContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
});