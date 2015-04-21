"use strict";


// ## Stage constants (higher number will render OVER lower number)
var STAGE_BACKGROUND = 0;
var SCENE_BACKGROUND = 'background';
var STAGE_LEVEL = 1;
var SCENE_LEVEL = 'levelScreen';
var STAGE_WELCOME = 1;
var SCENE_WELCOME = 'welcomeScreen';
var STAGE_MAP_SELECT = 1;
var SCENE_MAP_SELECT = 'mapSelectionScreen';
var STAGE_END_GAME = 2;
var STAGE_SCORE = 2;
var SCENE_SCORE = 'scoreScreen';
var STAGE_HUD = 3;
var SCENE_HUD = 'hudScreen';
var STAGE_STATUS = 5;
var SCENE_STATUS = 'statusScreen';
var STAGE_INFO = 6;
var SCENE_INFO = 'infoScreen';
var STAGE_MINIMAP = 7;
var SCENE_END_GAME = SCENE_SCORE;
var STAGE_HIDDEN = 10;
var STAGE_NOTIFICATION = 15;
var SCENE_NOTIFICATION = 'notificationScreen';

// ## UI constants
var SCOREBOARD_OVERLAY_COLOR = "rgba(1,1,1,0.3)";
var SCOREBOARD_TEXT_COLOR = "rgba(1,1,1,0.7)";
var SCOREBOARD_HIGHLIGHT_SELF = "rgba(255, 255, 194, 0.7)"; //light yellowish
var UI_PADDING_VALUE = 5; //in pixels
var LIGHT_GREY = "#CCCCCC";
var DARK_GREY = "rgba(0,0,0,0.4)";
var DARKER_GREY = "rgba(0,0,0,0.5)";
var DARKEST_GREY = "rgba(0,0,0,0.7)";

var MAP_LEVELS = {level1: 'Ironham', level2: 'Millhedge', level3: 'Oakmarsh'}

var welcomeCharSelected;
var welcomeSessionSelected; 
var isWelcomeSelectedSessionFull;
var isWelcomeSelectedCharInUse;

var mapSelected;

var infoMsgList = [];
var infoTimeLeftList= [];
var infoPositionList = [];

var FONT_FAMILY = "Trebuchet MS";
var WEIGHT_TITLE = 800;
var WEIGHT_BOLD = 600;
var WEIGHT_NORMAL =  200;

var SIZE_TITLE = Math.max(Math.ceil(Q.height/20),Math.ceil(Q.width/40));
SIZE_TITLE -= SIZE_TITLE%2;
var SIZE_BOLD = Math.max(Math.ceil(Q.height/40), Math.ceil(Q.width/80));
SIZE_BOLD -= SIZE_BOLD%2;
var SIZE_NORMAL = Math.max(Math.ceil(Q.height/50),Math.ceil(Q.width/100));
SIZE_NORMAL -= SIZE_NORMAL%2;
var SIZE_SMALL = Math.max(Math.ceil(Q.height/60),Math.ceil(Q.width/140));
SIZE_SMALL -= SIZE_SMALL%2;

var FONT_BOLD = WEIGHT_BOLD +' '+SIZE_BOLD+'px '+FONT_FAMILY;
var FONT_NORMAL = WEIGHT_NORMAL+' '+SIZE_NORMAL+'px '+FONT_FAMILY;

var WIDTH_HUD = 9*Q.width/10;
var HEIGH_HUD = Q.height/10;

// HUD constants
var HUD_ACTIVE_DOUBLE_DMG = "icon_attack_active";
var HUD_ACTIVE_150_MOVESPEED = "icon_movement_active";
var HUD_ACTIVE_ZERO_MANA_COST = "icon_mana_active";
var HUD_INACTIVE_DOUBLE_DMG = "icon_attack_inactive";
var HUD_INACTIVE_150_MOVESPEED = "icon_movement_inactive";
var HUD_INACTIVE_ZERO_MANA_COST = "icon_mana_inactive";

//Scoreboard constants
var SCOREBOARD_SHEET = ["scoreboard_first", "scoreboard_second", "scoreboard_third", "scoreboard_fourth"];

var STATS_OFFSET = 25;

// welcome screen to allow player to choose characterSprites and sessionSprites
Q.scene(SCENE_WELCOME,function(stage) {

  // clear sessioned selected when the session is longer available
  if(welcomeSessionSelected && !sessions[welcomeSessionSelected]){
    welcomeSessionSelected = undefined;
  }

  var title = stage.insert(new Q.UI.Text({  x:Q.width/2,
                                            y:Q.height/30,
                                            weight: WEIGHT_TITLE,
                                            size: SIZE_TITLE,
                                            font: FONT_FAMILY,
                                            align: 'center',
                                            color: 'red',
                                            label: "Elemental Frenzy"
                                          }));

  // join button
  var isShow = !isWelcomeSelectedSessionFull && welcomeSessionSelected && !isWelcomeSelectedCharInUse && welcomeCharSelected;

  var buttonJoin = stage.insert(new Q.UI.Button({ fill: 'limegreen',
                                                  opacity: isShow ? 1 : 0,
                                                  x: Q.width/2,
                                                  y: 12*Q.height/13,
                                                  w: Q.width/10,
                                                  h: Q.height/20,
                                                  label: 'Join',
                                                  font: FONT_BOLD,
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
        cs.p.fill = null;

        if(cs.p.characterId == welcomeCharSelected){
          welcomeCharSelected = undefined;
        }
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
                                                          y: 7.05*Q.height/11,
                                                          w: 3*Q.width/4,
                                                          h: Q.height/4,
                                                          fill: DARKER_GREY
                                                        }));

  var sSpriteW = 3*sessionsSection.p.w/5;
  var sSpriteH = 2*sessionsSection.p.h/19;
  var offsetY = sSpriteH + 5;
  var sessionSprites = {};
  var charactersInUse = {};
  var numSession = 0;

  // console.log("sessions : "+JSON.stringify(sessions,null,4));
  
  for(var s in sessions){
    // session sprites
    var sInfo = sessions[s];
    var sLabel = "[ "+sInfo.playerCount+"/"+sInfo.playerMaxCount+" ] Session "+sInfo.sessionId;

    var mapName = MAP_LEVELS[sInfo.level];
    if(mapName){
      sLabel +=" ("+mapName+")";
    }
    
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
                                    w: sSpriteW,
                                    h: sSpriteH,
                                    label: sLabel,
                                    font: FONT_NORMAL,
                                    fontColor:  isFull ? 'red' : 'black',
                                    sessionId: sInfo.sessionId,
                                    isFull: isFull
                                  });
    sessionSprites[numSession] = sSprite;
    numSession++;
  }

  // please choose a session
  var choiceSession = stage.insert(new Q.UI.Text({x:sessionsSection.p.x,
                                                  y:sessionsSection.p.y - 4*sessionsSection.p.h/9,
                                                  weight: WEIGHT_BOLD,
                                                  size: SIZE_BOLD,
                                                  font: FONT_FAMILY,
                                                  align: 'center',
                                                  color: 'black',
                                                  label: "Please choose a session to join"
                                                }));
 

  // insert session into container
  var container_session = stage.insert(new Q.UI.Container({ x: sessionsSection.p.x, 
                                                            y: sessionsSection.p.y - 4*sessionsSection.p.h/15, 
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
                                              h: 2*sessionsSection.p.h/19,
                                              label: 'No session is avaiable at the moment',
                                              font: FONT_NORMAL,
                                              fontColor: 'black',
                                              buttonId: numSession
                                            }));
  }

  sessionsSection.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);



  // characterSprites selection section
  var characterSection = stage.insert(new Q.UI.Container({x: Q.width/2, 
                                                          y: 3.1*Q.height/13,
                                                          w: 3*Q.width/4,
                                                          h: Q.height/4,
                                                          fill: DARK_GREY
                                                        }));

  var characterSprites = {};
  var nameSprites = {};
  var numChar = 0;
  var offsetX = Math.max(40, Q.width/10);
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
    nameSprites[numChar] = new Q.UI.Text({x:0,
                                          y: Math.max(20, Q.height/20),
                                          weight: WEIGHT_BOLD,
                                          size: SIZE_NORMAL,
                                          font: FONT_FAMILY,
                                          align: 'center',
                                          color: PLAYER_NAME_COLORS[numChar],
                                          label: PLAYER_NAMES[numChar]
                                  });
    numChar++;
  }


  // please choose your characterSprites
  var choicecharacterSprites = stage.insert(new Q.UI.Text({ x:characterSection.p.x,
                                                            y:characterSection.p.y - 3*characterSection.p.h/7,
                                                            weight: WEIGHT_BOLD,
                                                            size: SIZE_BOLD,
                                                            font: FONT_FAMILY,
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
        // deselect character
        this.p.fill = null;
        welcomeCharSelected = undefined;
        isWelcomeSelectedCharInUse = false;

      }else if(isCharacterInUse(this.p.characterId)){
        // select in use character
        isWelcomeSelectedCharInUse = true;
      }else{
        
        // select not in use character
        isWelcomeSelectedCharInUse = false;
        this.p.fill = LIGHT_GREY;
        welcomeCharSelected = this.p.characterId;
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


  var controlsTitleColor = 'hotpink';
  var controlsTextColor = 'white';
  //control panel
  var controlsContainer = stage.insert(new Q.UI.Container({    x   : Q.width/2, 
                                                               y   : 9.2*Q.height/11,
                                                               w   : 3*Q.width/4,
                                                               h   : Q.height/10,
                                                               fill: DARKEST_GREY
                                                        }));

  //controls in text form
  var changeElementTitle = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x - 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y,
                                                  weight: WEIGHT_BOLD,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTitleColor,
                                                  label : 'Change attack element'
                                              }));

  var changeElementText = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x - 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y,
                                                  weight: WEIGHT_NORMAL,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTextColor,
                                                  label : '\nSPACE'
                                              }));

  var movementTitle = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x - 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y - (2*controlsContainer.p.h/5),
                                                  weight: WEIGHT_BOLD,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTitleColor,
                                                  label : 'Movement'
                                              }));

  var movementText = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x - 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y - (2*controlsContainer.p.h/5),
                                                  weight: WEIGHT_NORMAL,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTextColor,
                                                  label : '\nW,A,S,D'
                                              }));

  var shootTitle = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x + 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y - (2*controlsContainer.p.h/5),
                                                  weight: WEIGHT_BOLD,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTitleColor,
                                                  label : 'Shoot'
                                              }));

  var shootText = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x + 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y - (2*controlsContainer.p.h/5),
                                                  weight: WEIGHT_NORMAL,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTextColor,
                                                  label : '\nMouse Click'
                                              }));

  var scoreboardTitle = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x + 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y,
                                                  weight: WEIGHT_BOLD,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTitleColor,
                                                  label : 'Scoreboard'
                                              }));

  var scoreboardText = stage.insert(new Q.UI.Text({ 
                                                  x     : controlsContainer.p.x + 2* controlsContainer.p.w / 12,
                                                  y     : controlsContainer.p.y,
                                                  weight: WEIGHT_NORMAL,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : controlsTextColor,
                                                  label : '\nHold TAB'
                                              }));

  //instrctions panel
  var instructionsContainer = stage.insert(new Q.UI.Container({
                                                              x   : Q.width/2, 
                                                              y   : 4.85*Q.height/11,
                                                              w   : 3*Q.width/4,
                                                              h   : Q.height/9,
                                                              fill: DARKEST_GREY
                                                        }));

  var instructions = 'Instructions:'+
  '\nTake down opponents by consuming their elements!'+
  '\nFire > Earth > Lightning > Water > Fire'+
  '\n(\">\" means passes through)';
                                              
  var instructionText = stage.insert(new Q.UI.Text({ 
                                                  x     : instructionsContainer.p.x,
                                                  y     : instructionsContainer.p.y - (2*instructionsContainer.p.h/5),
                                                  weight: WEIGHT_NORMAL,
                                                  size  : SIZE_SMALL,
                                                  font  : FONT_FAMILY,
                                                  align : 'center',
                                                  color : 'limegreen',
                                                  label : instructions
                                                  }));

  controlsContainer.fit(UI_PADDING_VALUE, UI_PADDING_VALUE);
  instructionsContainer.fit(UI_PADDING_VALUE, UI_PADDING_VALUE);
});

Q.scene(SCENE_MAP_SELECT, function(stage){


  var title = stage.insert(new Q.UI.Text({  x:Q.width/2,
                                            y:Q.height/20,
                                            weight: WEIGHT_TITLE,
                                            size: SIZE_TITLE,
                                            font: FONT_FAMILY,
                                            align: 'center',
                                            color: 'red',
                                            label: "Elemental Frenzy Session"
                                          }));

  // create button
  var isShow = (mapSelected !== undefined && mapSelected);

  var buttonCreate = stage.insert(new Q.UI.Button({ fill: 'limegreen',
                                                    opacity: isShow ? 1 : 0,
                                                    x: Q.width/2,
                                                    y: Q.height*0.9,
                                                    w: Q.width/10,
                                                    h: Q.height/20,
                                                    label: 'Create',
                                                    font: FONT_BOLD,
                                                    fontColor: 'black'
                                                }));

  buttonCreate.on("click", function() {
    if(mapSelected !== undefined && mapSelected){
      Q.input.trigger('create', {level: mapSelected});
    }
  });

   // map selection section
  var mapsSection = stage.insert(new Q.UI.Container({ x: Q.width/2, 
                                                      y: Q.height/2,
                                                      w: Q.width*0.75,
                                                      h: Q.height*0.7,
                                                      fill: DARKER_GREY
                                                    }));

  var baseStage = STAGE_HIDDEN;
  for(var m in MAP_LEVELS){
    Q.stageScene(SCENE_LEVEL, baseStage,{level: m});
    Q.stage(baseStage).add('viewport');
    baseStage++;
  }

  var mapCount = baseStage - STAGE_HIDDEN;
  var screenH = mapsSection.p.h*0.70/mapCount;
  var screenW = mapsSection.p.w/3;
  var mapStartX = mapsSection.p.x - mapsSection.p.w*0.17;
  var mapStartY = mapsSection.p.y - mapsSection.p.h*0.35;

  for(var b = STAGE_HIDDEN; b < baseStage; b++){
      
      var mapStage = Q.stage(b);
      var mapIndex = b - STAGE_HIDDEN;
      
      var cLayer = mapStage._collisionLayers[0];
      var vpScale = 0.1;
      var mapH = screenH;
      var mapW = screenW;
      
      if(cLayer) {
        mapH = cLayer.p.h;
        mapW = cLayer.p.w;
        vpScale = Math.min(1, Math.min(screenW/mapW, screenH/mapH));
        vpScale = Math.round(vpScale * 100) / 100;
      }

      var vpStartX = -(mapStartX - mapW*vpScale/2) / vpScale;
      var vpStartY = -(mapStartY + (screenH/2 - mapH*vpScale/2) + mapIndex*screenH*1.2) / vpScale;

      mapStage.viewport.scale = vpScale;
      mapStage.viewport.moveTo(vpStartX, vpStartY);
  }

  // map listing
  var mapListing = stage.insert(new Q.UI.Text({ x:mapsSection.p.x - mapsSection.p.w*0.17,
                                                y:mapsSection.p.y - 4*mapsSection.p.h/9,
                                                weight: WEIGHT_BOLD,
                                                size: SIZE_BOLD,
                                                font: FONT_FAMILY,
                                                align: 'center',
                                                color: 'black',
                                                label: "Map Listings"
                                              }));

  // please select a map
  var mapSelection = stage.insert(new Q.UI.Text({ x:mapsSection.p.x + mapsSection.p.w*0.25,
                                                  y:mapsSection.p.y - 4*mapsSection.p.h/9,
                                                  weight: WEIGHT_BOLD,
                                                  size: SIZE_BOLD,
                                                  font: FONT_FAMILY,
                                                  align: 'center',
                                                  color: 'black',
                                                  label: "Please select a map"
                                                }));
 

  // insert map into container
  var container_map = stage.insert(new Q.UI.Container({ x:mapsSection.p.x + mapsSection.p.w*0.25,
                                                        y:mapsSection.p.y - 4*mapsSection.p.h/9
                                                      }));

  var mNameSpriteW = mapsSection.p.w*0.30;
  var mNameSpriteH = 2*mapsSection.p.h/19;
  var numMap = 0;
  var mNameSprites = {};
  for(var m in MAP_LEVELS){
    // map name sprites
    var mapName = MAP_LEVELS[m];

    var mNameSprite = new Q.UI.Button({fill: m == mapSelected ? LIGHT_GREY : null,
                                          x: 0,
                                          y: mapStartY - screenH*0.6 + numMap*screenH*1.2,
                                          w: mNameSpriteW,
                                          h: mNameSpriteH,
                                          label: mapName,
                                          font: FONT_NORMAL,
                                          mapId: m,
                                          fontColor:  'black'
                                        });
    mNameSprites[numMap] = mNameSprite;
    container_map.insert(mNameSprite);
    numMap++;
  }

  container_map.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);

  for(var mns in mNameSprites){

    mNameSprites[mns].on("click", function() {  

      if(this.p.fill){
        this.p.fill = null;
        mapSelected = undefined;

      }else{
        this.p.fill = LIGHT_GREY;
        mapSelected = this.p.mapId;

        // reset others
        for(var o in mNameSprites){
          if(mapSelected !== mNameSprites[o].p.mapId){
            mNameSprites[o].p.fill = null;
          }
        }
      }

      // show create button if a map is selected
      if(mapSelected){
        buttonCreate.p.opacity = 1;
      }else{
        buttonCreate.p.opacity = 0;
      }
    });
  }
});


// create background screen
Q.scene(SCENE_BACKGROUND,function(stage) {

  // Add in a repeater for a little parallax action
  stage.insert(new Q.Repeater({ asset: "background-wall.png", 
                                speedX: 0.5, 
                                speedY: 0.5 })
  );
});

Q.scene(SCENE_LEVEL, function(stage) {

  var miniStage = stage.options.miniStage;
  var mapStage = Q.stage(miniStage);

  var level = stage.options.level;

  if(miniStage !== undefined && mapStage !== undefined){
    // postrender is trigger after all the items in the stage is renderred according to the viewport if it exists
    mapStage.on("postrender", function(ctx){

      // call viewport to push matrix and translate and scale if viewport exists
      stage.trigger('prerender', ctx);

      var vp = stage.viewport;
      var screenH = Q.height/3;
      var screenW = Q.width/3;
      var startX, startY, endX, endY;

      var cLayer = mapStage._collisionLayers[0];
      var vpScale = 0.1;
      if(cLayer) {
        vpScale = Math.max(0.2, Math.min(1, Math.max(screenW/cLayer.p.w, screenH/cLayer.p.h)));
        vpScale = Math.round(vpScale * 100) / 100;
      }
      
      if(vp) {
        vp.scale = vpScale;
        vp.screenW = screenW;
        vp.screenH = screenH;

        startX = Math.floor(vp.x);
        startY = Math.floor(vp.y);
        endX = Math.floor(vp.x + screenW/vpScale);
        endY = Math.floor(vp.y + screenH/vpScale);

        // keep minimap in the center-bottom
        var offsetX = Q.width/2/vpScale - screenW/2/vpScale;
        var offsetY = 0.97*Q.height/vpScale - screenH/vpScale;
        ctx.translate(offsetX, offsetY);

        // draw background and add title for minimap
        ctx.save();
        
        var textSize = Math.floor(SIZE_NORMAL/vpScale);
        var backgroundStartX = vp.centerX-(screenW/2/vpScale);
        var backgroundStartY = vp.centerY-(screenH/2/vpScale) - textSize*1.5;
        var backgroundW = screenW/vpScale;
        var backgroundH = screenH/vpScale + textSize*1.5;

        ctx.fillStyle = DARK_GREY;
        ctx.fillRect(backgroundStartX, backgroundStartY, backgroundW, backgroundH);

        ctx.fillStyle = LIGHT_GREY;
        ctx.font = WEIGHT_BOLD + " " + textSize + "px " + FONT_FAMILY;
        ctx.textAlign = 'center';
        ctx.fillText("Mini Map", vp.centerX, backgroundStartY);
        
        ctx.restore();
      }

      // store viewport
      var preVp = mapStage.viewport;
      if(preVp && vp){
        // change to minimap viewport
        mapStage.viewport = vp;
        vp.softCenterOn(preVp.centerX, preVp.centerY);
      }

      // render miniStage
      var mapVp = mapStage.viewport;
      for(var i=0,len=mapStage.items.length;i<len;i++) {
        var item = mapStage.items[i];
        // Don't render sprites with containers (sprites do that themselves)
        // Also don't render if not onscreen

        var isWithinX = false;
        var isWithinY = false;

        // collision layer (titleLayer will calculate itself int its render() method by taking viewport setting into account)
        if(item.p && !item.collisionLayer && vp && startX && startY && endX && endY){
          isWithinX = startX <= item.p.x && endX >= item.p.x;
          isWithinY = startY <= item.p.y && endY >= item.p.y;
        }

        if(!item.container && !item.isA('Repeater') &&(item.p.renderAlways ||(isWithinX && isWithinY))) {
          item.render(ctx);
        }
      }

      // restore viewport
      mapStage.viewport = preVp;
      
      // call viewport to pop matrix if viewport exists
      stage.trigger('render', ctx);   
    });    
  }else{
    // Add in a tile layer, and make it the collision layer
    stage.collisionLayer(new Q.TileLayer({dataAsset: level + '.json',
                                            sheet: 'map_tiles' })
    );
  }
});

Q.scene(SCENE_HUD, function(stage) {

  var isScreenWidthTooSmall = Q.width < 480 ? true : false;

  var hudContainer = stage.insert(new Q.UI.Container({ x: Q.width/2, 
                                                       y: 11*Q.height/100,
                                                       w: WIDTH_HUD,
                                                       h: HEIGH_HUD,
                                                       fill: DARK_GREY,
                                                       radius: 0 //0 = no rounded corners
                                                      }));

  var container_back = stage.insert(new Q.UI.Container({x: Q.width/10, 
                                                        y: Q.height/35
                                                      }));

  var backLabel = isSession ? "Switch Map" : "Switch Session";
  var buttonBack = container_back.insert(new Q.UI.Button({fill: 'limegreen',
                                                          opacity: 1,
                                                          x: SIZE_BOLD*backLabel.length/10,
                                                          y: 0,
                                                          h: SIZE_BOLD*1.4,
                                                          label: backLabel,
                                                          font: FONT_NORMAL,
                                                          fontColor: 'black'
                                                        }));

  buttonBack.on('click', function(){
    var msg;
    var callback;
    if(isSession){
      msg = "Switching map will disconnect all players in this session\nAre you sure to switch it?";
    }else{
      msg = "Switching session will cause you to lose all your current game progress\nAre you sure to switch it?";
   }

    var callback = function(){
      Q.input.trigger('switch');
    };

    var buttons = [{label: "YES", callback: callback}, {label: "NO"}];
    Q.stageScene(SCENE_NOTIFICATION, STAGE_NOTIFICATION, {msg: msg, buttons: buttons});
  });

  container_back.fit(UI_PADDING_VALUE, UI_PADDING_VALUE);

  if(!isSession){
    var currentPlayer = getPlayerSprite(selfId);
    if(!currentPlayer){
      console.log("Cannot locate current player during HUD element selector initialization");
      return;
    }
    var element = currentPlayer.p.element;
    // convert into number
    element = Number(element);
    
    if(!(element >= 0 && element < ELEBALL_ELEMENTNAMES.length)){
      console.log("Invalid element during HUD element selector initialization [element: "+element+"]");
      return;
    }

    var eleSelectors = {};
    var eleW = 70;
    var eleH = 30;
    var inactiveScale = 0.3;
    var activeScale = 1;
    var scalingStep = 0.1;
    var selector = hudContainer.insert(new Q.UI.Container({x: -hudContainer.p.w/2 + eleW, 
                                                           y: 0,
                                                           activeElement: element,
                                                           targetAngle: 0,
                                                           angleStep: 0,
                                                           angleShifted: 0,
                                                           angleNeeded: 0
                                                          }));

    selector.on('step', function(dt){

      var player = getPlayerSprite(selfId);
      if(player && this.p.activeElement != player.p.element){
        
        console.log("Element toggling: player-"+player.p.element+" selector-"+this.p.activeElement);
        
        updateEleSelector(player.p.element);
      }

      var a = this.p.angle;
      var tAngle = this.p.targetAngle;
      var aNeeded = this.p.angleNeeded;
      var aShifted = this.p.angleShifted;
      var aStep = this.p.angleStep;

      if(Math.abs(aNeeded) > Math.abs(aShifted)){

        // console.log("aNeeded "+aNeeded+" aShifted "+aShifted+" tAngle "+tAngle+" angle "+a);
        
        var aS = aStep * dt;
        this.p.angleShifted += aS;
        if(Math.abs(this.p.angleShifted) > Math.abs(aNeeded)){
          // console.log("reverted to "+(this.p.angleShifted - aS)+" aShifted "+this.p.angleShifted+" aStep "+aS);
          aS = (Math.abs(aNeeded) - Math.abs(this.p.angleShifted - aS)) * Math.sign(aNeeded);
          // console.log("over shot: aNeeded "+aNeeded+" aShifted "+this.p.angleShifted+" as "+aS);
          this.p.angleShifted = aNeeded;
        }
        var nextAngle = a + aS;

        if(nextAngle<0){
          nextAngle = 360 + nextAngle;
        }

        // console.log('next angle '+nextAngle);
        var nAngle = Math.max(nextAngle % 360, 0);
        this.p.angle = nAngle;
      }
    });

    for(var eId in ELEBALL_ELEMENTNAMES){
      var eleId = Number(eId);
      var eleAngle = eleId * 90;
      var isActive = eleId == element;
      var scaling = isActive ? activeScale : inactiveScale;
      eleSelectors[eId] = selector.insert(new Q.UI.Button({ sheet: ELEBALL_ELEMENTNAMES[eId],
                                                            sprite: ELEBALL_ANIMATION,
                                                            angle: eleAngle,
                                                            scale: scaling,
                                                            targetScale: 1
                                                            }));

      eleSelectors[eId].on('step', function(dt){
        var s = this.p.scale;
        var tScale = this.p.targetScale;

        if(s != tScale){
          
          var sign = s > tScale ? -1 : 1;
          this.p.scale += sign*scalingStep;

          if(Math.abs(this.p.scale - tScale)< 0.01){
            this.p.scale = tScale;
          }
        }
      });
    }

    var updateEleSelector = function(nextElement){

      if(nextElement == undefined){
        console.log("Invalid element during HUD next element toggling");
        return;
      }
      
      for(var eId in eleSelectors){
        var eleId = Number(eId);
        var isActive = eleId == nextElement;
        var eleAngle = eleId * 90;
        var scaling = isActive ? activeScale : inactiveScale;

        var eS = eleSelectors[eId];
        eS.p.targetScale = scaling;
        eS.p.x = scaling*(Math.cos(eleAngle*2*Math.PI/360))*eleW/2;
        eS.p.y = scaling*(Math.sin(eleAngle*2*Math.PI/360))*eleW/2;

        if(isActive){
          eS.add('animation');
          eS.play('fire');
        }else if(eS.has('animation')){
          eS.del('animation');
        }
      }

      var targetAngle = ((ELEBALL_ELEMENTNAMES.length- nextElement) *90 )% 360;
      var angleNeeded = Math.abs(selector.p.angle - targetAngle);
      var sign;
      var currentEle = selector.p.activeElement;
      var numEle = ELEBALL_ELEMENTNAMES.length;

      if((currentEle != 0 && currentEle != 3 && currentEle >= nextElement) ||
        // special case for 0
        (currentEle == 0 && currentEle <= nextElement && (currentEle+numEle/2)%numEle <= nextElement) ||
        // special case for 3
        (currentEle == 3 && currentEle >= nextElement && (currentEle+numEle/2)%numEle <= nextElement)){
        //  move clockwise
        sign = 1;
      }else{
        // move counter clockwise
        sign = -1;
      }

      if(angleNeeded < 0){
        angleNeeded = 360 + angleNeeded;
      }

      if(angleNeeded >= 180){
        angleNeeded = 360 - angleNeeded;
      }

      selector.p.targetAngle = targetAngle;
      selector.p.angleNeeded = sign*angleNeeded;
      selector.p.angleStep = sign*angleNeeded/0.3;
      selector.p.angleShifted = 0;
      selector.p.activeElement = nextElement;

      // console.log("tAngle "+targetAngle+" a "+selector.p.angle+" aNeeded "+sign*angleNeeded+" aStep "+selector.p.angleStep+" sign "+sign);
    };

    updateEleSelector(element);
  }

  var initHud  = true;
  var initHud2 = true;

  var powerupMana_ZeroMana;
  var powerupAtk_DoubleDmg;
  var powerupMovement_150Speed;
  var powerupIconCenterX = [];
  var powerupIconCenterY = [];

  var timerText;

  var secondHudContainer = null;
  if (!isSession && isScreenWidthTooSmall && initHud2) {
    secondHudContainer = stage.insert(new Q.UI.Container({ 
                                                     x: Q.width/2, 
                                                     y: hudContainer.p.y + hudContainer.p.h/2 + HEIGH_HUD / 2,
                                                     w: WIDTH_HUD,
                                                     h: HEIGH_HUD,
                                                     fill: DARK_GREY,
                                                     radius: 0 //0 = no rounded corners
                                                    }));

    secondHudContainer.on('draw', secondHudContainer, function(ctx) {

      var currentPlayer = getPlayerSprite(selfId);
      if(!currentPlayer) {
        console.log("Cannot locate current player during HUD player attribute drawing");
        resetPowerupIcons();
        return;
      }

      /*
      ** Power ups
      */
      var powerupIconWidth        = 34;
      var spaceBetweenPowerupIcon = 15;
      var borderWidth             = 4;
      var numPowerupsType         = 3;

      var scaleToHeight = (this.p.h > (powerupIconWidth + 2 * borderWidth)) ? 1 : this.p.h / (powerupIconWidth + 2 * borderWidth);

      if (initHud2) {

        initialisePowerupPlacementsInHud(numPowerupsType, powerupIconCenterX, powerupIconCenterY, powerupIconWidth, scaleToHeight, spaceBetweenPowerupIcon);

        powerupMana_ZeroMana        = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_ZERO_MANA_COST,
                                                                    x    : powerupIconCenterX[0],
                                                                    y    : powerupIconCenterY[0],
                                                                    scale: scaleToHeight
                                      }));
        powerupAtk_DoubleDmg        = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_DOUBLE_DMG,
                                                                    x    : powerupIconCenterX[1],
                                                                    y    : powerupIconCenterY[1],
                                                                    scale: scaleToHeight
                                      }));
        powerupMovement_150Speed    = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_150_MOVESPEED,
                                                                    x    : powerupIconCenterX[2],
                                                                    y    : powerupIconCenterY[2],
                                                                    scale: scaleToHeight
                                      }));
      } else {
        var isZeroManaActive        = currentPlayer.p.powerupsHeld[POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST];
        var isDoubleDmgActive       = currentPlayer.p.powerupsHeld[POWERUP_CLASS_ATTACK_150PERCENTDMG];
        var is150MovespeedActive    = currentPlayer.p.powerupsHeld[POWERUP_CLASS_MOVESPEED_150PERCENTSPEED];
        
        powerupMana_ZeroMana.p.sheet        = isZeroManaActive        ? HUD_ACTIVE_ZERO_MANA_COST : HUD_INACTIVE_ZERO_MANA_COST;
        powerupAtk_DoubleDmg.p.sheet        = isDoubleDmgActive       ? HUD_ACTIVE_DOUBLE_DMG     : HUD_INACTIVE_DOUBLE_DMG;
        powerupMovement_150Speed.p.sheet    = is150MovespeedActive    ? HUD_ACTIVE_150_MOVESPEED  : HUD_INACTIVE_150_MOVESPEED;
        
        if (isZeroManaActive) {
          var timeLeftForZeroMana = currentPlayer.p.powerupsTimeLeft[POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST];
          drawSquareWithRoundedCorners(timeLeftForZeroMana,POWERUP_DURATION_MANA_REDUCE70PERCENTMANACOST, 
                                     powerupIconCenterX[0], powerupIconCenterY[0], powerupIconWidth, borderWidth, scaleToHeight, ctx);
        }

        if (isDoubleDmgActive) {
          var timeLeftForDoubleDmg = currentPlayer.p.powerupsTimeLeft[POWERUP_CLASS_ATTACK_150PERCENTDMG];
          drawSquareWithRoundedCorners(timeLeftForDoubleDmg,POWERUP_DURATION_ATTACK_150PERCENTDMG, 
                                     powerupIconCenterX[1], powerupIconCenterY[1], powerupIconWidth, borderWidth, scaleToHeight, ctx);
        }

        if (is150MovespeedActive) {
          var timeLeftFor150Movespeed = currentPlayer.p.powerupsTimeLeft[POWERUP_CLASS_MOVESPEED_150PERCENTSPEED];
          drawSquareWithRoundedCorners(timeLeftFor150Movespeed,POWERUP_DURATION_MOVESPEED_150PERCENTSPEED, 
                                     powerupIconCenterX[2], powerupIconCenterY[2], powerupIconWidth, borderWidth, scaleToHeight, ctx);
        }
      }
      initHud2 = false;
    });
  }

  hudContainer.on('draw', hudContainer, function(ctx) {

    /*
    ** Timer
    */
    var timerPosY = secondHudContainer === null ? 
                    hudContainer.p.y + hudContainer.p.h/2 : secondHudContainer.p.y + secondHudContainer.p.h/2 ;
                    
    var timeLeft = Q.state.get('timeLeft');
    if(timeLeft === undefined){
      timeLeft = Q.state.get('totalTime');
    }

    if (initHud) {
      timerText = stage.insert(new Q.UI.Text({
      label : getTimeFormat(timeLeft),
      x: Q.width/2,
      y: timerPosY,
      size: SIZE_TITLE,
      font: FONT_FAMILY
      }));

    } else {
      timerText.p.label = getTimeFormat(timeLeft);
      timerText.p.color = timeLeft < 15 ? 'red' : 'black'; 
    }

    if(isSession){
      var pList = session.players;
      var rtts = {};
      var numPlayer = 0;

      if(pList){
        
        for(var p in pList){
          rtts[p] = getAvgRttOfPlayer(p);
          numPlayer++;
        }  
      }


      ctx.save();
      color           = LIGHT_GREY;
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      ctx.textAlign   = "center";
      centerX         = 0;
      centerY         = -hudContainer.p.h/5;
      ctx.font        = WEIGHT_NORMAL + " "+SIZE_BOLD+"px "+FONT_FAMILY;
      
      if(numPlayer > 0){
        centerY = -hudContainer.p.h/2;

        var msg = "There are "+numPlayer+" player"+(numPlayer > 1 ? "s": "")+" connected to this session";
        ctx.fillText(msg, centerX, centerY);
        
        ctx.textAlign = 'left';
        ctx.font = FONT_NORMAL;

        var rttLabelW = hudContainer.p.w*0.28;
        centerX = -rttLabelW*0.25;
        var count = 0;

        for(var r in rtts){
          var playerRtt = roundToOneDecimalPlace(rtts[r]);
          msg = "Player "+r+" RTT: "+playerRtt+" ms";

          var startX = centerX + ((numPlayer > 1) ? 1 : count%2)*(rttLabelW/2)*(count%2 ? 1: -1);
          var startY = centerY + (hudContainer.p.h/3)*(Math.floor(count/2)+1);
          
          // to visualize where the boundaries of the text are
          // ctx.strokeRect(startX, startY, rttLabelW, (hudContainer.p.h/3));
          
          ctx.fillText(msg, startX , startY);

          count++;
        }
      }else{
        ctx.fillText("No player has connected to this session", centerX, centerY);
      }
      ctx.restore(); 
    }


    var currentPlayer;
    if(!isSession){
      currentPlayer = getPlayerSprite(selfId);
      if(!currentPlayer) {
        console.log("Cannot locate current player during HUD player attribute drawing");
        resetPowerupIcons();
        return;
      }
      
      /* 
      ** HP CIRCLE
      ** represented by a hollow circle with text inside
      */
      var radius    = this.p.h*0.3;
      var lineWidth = radius / 2;
      ctx.lineWidth = lineWidth;
      ctx.textAlign = "center";

      //if circles will overlap each other, then adjust based on width instead
      if (radius + lineWidth > this.p.w/15) {
        radius        = this.p.w / 20;
        lineWidth     = radius / 2;
        ctx.lineWidth = lineWidth;
      }

      var currentHp = Math.round(currentPlayer.p.currentHealth);
      var maxHp     = currentPlayer.p.maxHealth;
      var scaledHp  = currentHp / maxHp;

      //green -> yellow -> red
      var color       = scaledHp > 0.5 ? 'limegreen' : scaledHp > 0.25 ? 'yellow' : 'brown';
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      var centerX     = 4*this.p.w/15;
      var centerY     = 0;
      
      drawHollowCircleWithTextInside(currentHp, maxHp, centerX, centerY, radius, ctx);

      /* 
      ** MANA CIRCLE
      ** represented by a hollow circle with text inside
      */
      var currentMana = Math.round(currentPlayer.p.currentMana);
      var maxMana     = currentPlayer.p.maxMana;

      color           = '#3BB9FF'; //blue
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      centerX         = 6*this.p.w/15;
      centerY         = 0;

      drawHollowCircleWithTextInside(currentMana, maxMana, centerX, centerY, radius, ctx);

      //icon sprites are 34 by 34. ideal case is scale their height to this.p.h / 3
      var scaleIcons = this.p.h / 3 / 34;
      /*
      ** Mana cost per shot
      ** represented by a light blue line with blue text beside
      */

      color           = '#3BB9FF'; //blue
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      centerX         = selector.p.x - eleW / 1.2;
      centerY         = selector.p.y;
      var manaPerShot = roundToOneDecimalPlace(currentPlayer.p.manaPerShot);
      ctx.font        = WEIGHT_BOLD + " " +"12px "+FONT_FAMILY;

      ctx.fillText(manaPerShot, centerX + STATS_OFFSET, centerY - 6);

      if (initHud) {
        this.insert(new Q.UI.Button({ sheet: HUD_ACTIVE_ZERO_MANA_COST,
                                      x: centerX,
                                      y: centerY,
                                      scale: scaleIcons
                                      }));
      }

      /*
      ** Attack Damage per shot
      ** represented by a sword with orangey text beside
      */
      color             = '#F88017'; //orangey
      ctx.strokeStyle   = color;
      ctx.fillStyle     = color;
      centerY           = selector.p.y - this.p.h / 3;
      var damagePerShot = roundToOneDecimalPlace(currentPlayer.p.dmg);
      ctx.font          = WEIGHT_BOLD + " " +"12px "+FONT_FAMILY;

      ctx.fillText(damagePerShot, centerX + STATS_OFFSET, centerY - 6);

      if (initHud) {
        this.insert(new Q.UI.Button({ sheet: HUD_ACTIVE_DOUBLE_DMG,
                                      x: centerX,
                                      y: centerY,
                                      scale: scaleIcons
                                      }));
      }

      /*
      ** Movement Speed
      ** represented by a shoe with green text beside
      */
      color           = '#00FF00'; //green
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      centerY         = selector.p.y + this.p.h / 3;
      var moveSpeed   = roundToOneDecimalPlace(currentPlayer.p.speed);
      ctx.font        = WEIGHT_BOLD + " " +"12px "+FONT_FAMILY;

      ctx.fillText(moveSpeed, centerX + STATS_OFFSET, centerY - 6);

      if (initHud) {
        this.insert(new Q.UI.Button({ sheet: HUD_ACTIVE_150_MOVESPEED,
                                      x    : centerX,
                                      y    : centerY,
                                      scale: scaleIcons
                                    }));
      }
    }
    
    /*
    ** Power ups
    */
    if (!isSession && secondHudContainer === null) {
      var powerupIconWidth        = 34;
      var spaceBetweenPowerupIcon = 15;
      var borderWidth             = 4;
      var numPowerupsType         = 3;

      var scaleToHeight = (this.p.h > (powerupIconWidth + 2 * borderWidth)) ? 1 : this.p.h / (powerupIconWidth + 2 * borderWidth);

      if (initHud) {

        initialisePowerupPlacementsInHud(numPowerupsType, powerupIconCenterX, powerupIconCenterY, powerupIconWidth, scaleToHeight, spaceBetweenPowerupIcon);

        powerupMana_ZeroMana        = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_ZERO_MANA_COST,
                                                                    x    : powerupIconCenterX[0],
                                                                    y    : powerupIconCenterY[0],
                                                                    scale: scaleToHeight
                                      }));
        powerupAtk_DoubleDmg        = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_DOUBLE_DMG,
                                                                    x    : powerupIconCenterX[1],
                                                                    y    : powerupIconCenterY[1],
                                                                    scale: scaleToHeight
                                      }));
        powerupMovement_150Speed    = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_150_MOVESPEED,
                                                                    x    : powerupIconCenterX[2],
                                                                    y    : powerupIconCenterY[2],
                                                                    scale: scaleToHeight
                                      }));

        //reset hud powerup icons when player dies
        currentPlayer.on('destroyed', function() {
          resetPowerupIcons();
        });

      } else {
        var isZeroManaActive        = currentPlayer.p.powerupsHeld[POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST];
        var isDoubleDmgActive       = currentPlayer.p.powerupsHeld[POWERUP_CLASS_ATTACK_150PERCENTDMG];
        var is150MovespeedActive = currentPlayer.p.powerupsHeld[POWERUP_CLASS_MOVESPEED_150PERCENTSPEED];
        
        powerupMana_ZeroMana.p.sheet        = isZeroManaActive        ? HUD_ACTIVE_ZERO_MANA_COST : HUD_INACTIVE_ZERO_MANA_COST;
        powerupAtk_DoubleDmg.p.sheet        = isDoubleDmgActive       ? HUD_ACTIVE_DOUBLE_DMG     : HUD_INACTIVE_DOUBLE_DMG;
        powerupMovement_150Speed.p.sheet    = is150MovespeedActive    ? HUD_ACTIVE_150_MOVESPEED  : HUD_INACTIVE_150_MOVESPEED;
        
        if (isZeroManaActive) {
          var timeLeftForZeroMana = currentPlayer.p.powerupsTimeLeft[POWERUP_CLASS_MANA_REDUCE70PERCENTMANACOST];
          drawSquareWithRoundedCorners(timeLeftForZeroMana,POWERUP_DURATION_MANA_REDUCE70PERCENTMANACOST, 
                                     powerupIconCenterX[0], powerupIconCenterY[0], powerupIconWidth, borderWidth, scaleToHeight, ctx);
        }

        if (isDoubleDmgActive) {
          var timeLeftForDoubleDmg = currentPlayer.p.powerupsTimeLeft[POWERUP_CLASS_ATTACK_150PERCENTDMG];
          drawSquareWithRoundedCorners(timeLeftForDoubleDmg,POWERUP_DURATION_ATTACK_150PERCENTDMG, 
                                     powerupIconCenterX[1], powerupIconCenterY[1], powerupIconWidth, borderWidth, scaleToHeight, ctx);
        }

        if (is150MovespeedActive) {
          var timeLeftFor150Movespeed = currentPlayer.p.powerupsTimeLeft[POWERUP_CLASS_MOVESPEED_150PERCENTSPEED];
          drawSquareWithRoundedCorners(timeLeftFor150Movespeed,POWERUP_DURATION_MOVESPEED_150PERCENTSPEED, 
                                     powerupIconCenterX[2], powerupIconCenterY[2], powerupIconWidth, borderWidth, scaleToHeight, ctx);
        }
      }
    }

    initHud = false;
  });

  var roundToOneDecimalPlace = function (number) {
    return Math.round(number * 10) / 10;
  };

  var resetPowerupIcons = function () {
    powerupMana_ZeroMana.p.sheet        = HUD_INACTIVE_ZERO_MANA_COST;
    powerupAtk_DoubleDmg.p.sheet        = HUD_INACTIVE_DOUBLE_DMG;
    powerupMovement_150Speed.p.sheet    = HUD_INACTIVE_150_MOVESPEED;
  };

  var initialisePowerupPlacementsInHud = function (numPowerupsType, arrayX, arrayY, iconWidth, scale, spaceBetweenIcons) {
    var centerX = -(numPowerupsType/2) * iconWidth * scale;
    var centerY = 0;
    for (var i = 0; i < numPowerupsType; i++) {
      arrayX.push(centerX);
      arrayY.push(centerY);
      centerX += iconWidth * scale + spaceBetweenIcons;
    }
  };

  /*
  ** This function fils a solid circle accordingly to value and maxValue, much like the HP circle.
  ** Then, once the circle is filled, it is clipped. A full square with rounded corners is drawn but
  ** only on the clipped area.
  */
  var drawSquareWithRoundedCorners = function (value, maxValue, centerX, centerY, radius, borderLineWidth, scale, ctx) {
    if (typeof value === 'undefined') {
      return;
    }

    var color       = '#FFFF00'; //yellow
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;

    var scaledValue         = value / maxValue;
    var start               = Math.PI * 2.0;
    var end                 = Math.PI / 2.0;
    var roundedCornerRadius = 3;

    radius += borderLineWidth;
    radius *= scale;

    var length = radius;
    var startX = centerX - length/2;
    var startY = centerY - length/2;

    ctx.save();
    ctx.lineWidth = borderLineWidth * scale;

    //draw a circle then clip it
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, ((start) * scaledValue) - end, -(end), true);
    ctx.clip();

    //draw a full rounded square
    ctx.beginPath();
    ctx.moveTo(startX + roundedCornerRadius, startY);
    ctx.lineTo(startX + length - roundedCornerRadius, startY);
    ctx.quadraticCurveTo(startX + length, startY, startX + length, startY + roundedCornerRadius);
    ctx.lineTo(startX + length, startY + length - roundedCornerRadius);
    ctx.quadraticCurveTo(startX + length, startY + length, startX + length - roundedCornerRadius, startY + length);
    ctx.lineTo(startX + roundedCornerRadius, startY + length);
    ctx.quadraticCurveTo(startX, startY + length, startX, startY + length - roundedCornerRadius);
    ctx.lineTo(startX, startY + roundedCornerRadius);
    ctx.quadraticCurveTo(startX, startY, startX + roundedCornerRadius, startY);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  };

  var drawHollowCircleWithTextInside = function (value, maxValue, centerX, centerY, radius, ctx) {
    var scaledValue = value / maxValue;
    var end         = Math.PI * 2.0;
    var start       = Math.PI / 2.0;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -(start), ((end) * scaledValue) - start, false);
    ctx.stroke();

    ctx.font = WEIGHT_NORMAL+" "+(radius*0.8)+"px "+FONT_FAMILY;
    ctx.fillText(value, centerX - 2*radius/29, centerY - radius/2);
  };
});

Q.scene(SCENE_INFO ,function(stage) {

  var msg = stage.options.msg;
  var countdown = stage.options.countdown;
  var countdownMsg = stage.options.countdownMsg;

  if(!msg){
    console.log("No message passed in when calling info scene");
    return;
  }

  var infoHolder = stage.insert(new Q.UI.Text({ x: Q.width/2,
                                          y: Q.height*0.45,
                                          size: 20,
                                          font: FONT_FAMILY,
                                          align: 'center',
                                          color: 'black',
                                          label: ' ',
                                          countDown: isNaN(countdown) ? 0 : Number(countdown),
                                          vx: 0,
                                          vy: -0.5
                                        }));

  infoMsgList.push(msg);
  infoTimeLeftList.push(3); // display for 3 second
  infoPositionList.push([0, -20]);

  infoHolder.on('step', infoHolder, function(dt){

    // if there is a countdown duration
    if(this.p.countDown <= 0){
      this.p.label = ' ';
    }else{
      var cdMsg;
      if(countdownMsg){
        cdMsg = countdownMsg + ' ';
      }
      this.p.label = cdMsg + Math.floor(this.p.countDown);
      this.p.countDown -= dt;
    }

    for (var i = 0; i < infoTimeLeftList.length; i++) {
      infoTimeLeftList[i] -= dt;
      
      if (infoTimeLeftList[i] <= 0) {
        // No need to display anymore, so remove it
        infoTimeLeftList.splice(i, 1);
        infoMsgList.splice(i, 1);
        infoPositionList.splice(i, 1);
      } else {
        // Need to display, so shift by vx, vy
        infoPositionList[i][0] += this.p.vx;
        infoPositionList[i][1] += this.p.vy;
      }
    }
  });

  infoHolder.on('draw', infoHolder, function(ctx) {
    ctx.font = WEIGHT_BOLD+" "+SIZE_BOLD+"px "+FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.fillStyle = this.p.color || 'black';

    for (var i = 0; i < infoMsgList.length; i++) {
      ctx.fillText( infoMsgList[i], 
                    infoPositionList[i][0], 
                    infoPositionList[i][1]);
    }
  });
});


Q.scene(SCENE_SCORE, function(stage) {
  
  var scoreSize = SIZE_BOLD;
  //every line takes about offsetY pixels
  var offsetY = scoreSize*1.5;

  var maxSizeOfRankIcons = offsetY - 3; //allow some space between icons
  var rankIconSize       = 34;
  var scaleRankIcons     = rankIconSize < maxSizeOfRankIcons ? 1 : maxSizeOfRankIcons / rankIconSize;

  var currentPlayer;
  if(!isSession){
    currentPlayer = getPlayerSprite(selfId);
  }

  /*
  ** Set up UI containers
  */
  var overlayContainer = stage.insert(new Q.UI.Container({
    fill  : SCOREBOARD_OVERLAY_COLOR,
    border: 5,
    x     : Q.width/2,
    y     : 20*Q.height/50,
    w     : WIDTH_HUD
  }));
  
  var rankContainer = stage.insert(new Q.UI.Container({
    x: -overlayContainer.p.w/3,
    y: 0
  }), overlayContainer)

  var nameContainer = stage.insert(new Q.UI.Container({ 
    x: -overlayContainer.p.w/3 + rankIconSize * scaleRankIcons,
    y: 0
  }),overlayContainer);

  var killsContainer = stage.insert(new Q.UI.Container({ 
    x: 0,
    y: 0
  }),overlayContainer);

  var deathsContainer = stage.insert(new Q.UI.Container({ 
    x: overlayContainer.p.w/3,
    y: 0
  }),overlayContainer);

  /*
  ** Set up Titles
  */

  // placeholder to set up the overlay
  stage.insert(new Q.UI.Text({ 
    //invisible placeholder
    label: "i",
    color: "rgba(1,1,1,0)",
    x    : 0,
    y    : 0,
    font : FONT_FAMILY,
    align: "center"
  }), overlayContainer);

  var rankTitle = stage.insert(new Q.UI.Text({ 
        //invisible placeholder
    label: "R",
    color: "rgba(1,1,1,0)",
    x    : 0,
    y    : 0,
    size : scoreSize,
    font : FONT_FAMILY,
    align: "right"
  }), rankContainer);

  var nameTitle = stage.insert(new Q.UI.Text({ 
    label: "NAME",
    color: SCOREBOARD_TEXT_COLOR,
    x    : 0,
    y    : 0,
    size : scoreSize,
    font : FONT_FAMILY,
    align: "left"
  }), nameContainer);

  var killsTitle = stage.insert(new Q.UI.Text({ 
    label: "KILLS",
    color: SCOREBOARD_TEXT_COLOR,
    x    : 0,
    y    : 0,
    size : scoreSize,
    font : FONT_FAMILY,
    align: "center"
  }), killsContainer);
  

  var deathsTitle = stage.insert(new Q.UI.Text({ 
    label: "DEATHS",
    color: SCOREBOARD_TEXT_COLOR,
    x    : 0,
    y    : 0,
    size : scoreSize,
    font : FONT_FAMILY,
    align: "right"
  }), deathsContainer);


  /*
  ** Loop through total number of players and add their scores line by line
  */
  var kills  = Q.state.get('kills');  
  var deaths = Q.state.get('deaths');
  
  //push to an array first, then sort. because javascript cannot directly sort Object by value
  var sortedByKillsAndDeath = [];
  for (var name in kills) {
    sortedByKillsAndDeath.push([name, kills[name]]);
  }

  //sort by kills
  sortedByKillsAndDeath.sort(function(a, b) {
    var returnValue = b[1] - a[1];

    //if kills are same, use deaths
    if (returnValue == 0) {
      returnValue = deaths[a[0]] - deaths[b[0]];
    }

    return returnValue;
  });

  var line = 1;
  for (var item in sortedByKillsAndDeath) {
    //don't need the values of sorted array, just need the name. 
    //values will be retrieved from original Object
    name = sortedByKillsAndDeath[item][0];

    if (typeof deaths[name] === 'undefined' || typeof kills[name] === 'undefined') {
      continue;
    }

    var scoreboardTextColor = SCOREBOARD_TEXT_COLOR;
    if (currentPlayer && currentPlayer.p.name == name) {
      scoreboardTextColor = SCOREBOARD_HIGHLIGHT_SELF;
    }

    var rankIconOffset = scaleRankIcons * rankIconSize / 2 + 2;

    stage.insert(new Q.UI.Button({
      sheet: SCOREBOARD_SHEET[line-1],
      x    : 0,
      y    : line * offsetY + rankIconOffset,
      scale: scaleRankIcons,
      align: "right"
    }), rankContainer);

    stage.insert(new Q.UI.Text({ 
      label: name,
      color: scoreboardTextColor,
      x    : 0,
      y    : line*offsetY,
      size : scoreSize,
      font : FONT_FAMILY,
      align : "left"
    }), nameContainer);

    stage.insert(new Q.UI.Text({ 
      label: kills[name].toString(),
      color: scoreboardTextColor,
      x    : 0,
      y    : line*offsetY,
      size : scoreSize,
      font : FONT_FAMILY,
      align: "center"
    }), killsContainer);

    stage.insert(new Q.UI.Text({ 
      label: deaths[name].toString(),
      color: scoreboardTextColor,
      x    : 0,
      y    : line*offsetY,
      size : scoreSize,
      font : FONT_FAMILY,
      align: "right"
    }), deathsContainer);

      ++line;
  }

  //padding between stuff in container and border of container
  rankContainer.fit(UI_PADDING_VALUE, UI_PADDING_VALUE);
  nameContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  killsContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  deathsContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  overlayContainer.fit(2*UI_PADDING_VALUE, UI_PADDING_VALUE);

  var endGame = stage.options.endGame;
  if(endGame){
    var buttonPlay = stage.insert(new Q.UI.Button({ x: 0, 
                                                    y: (line+2)*offsetY,
                                                    w: overlayContainer.p.w/3,
                                                    h: SIZE_BOLD*2,
                                                    font: FONT_BOLD,
                                                    fill: 'limegreen',
                                                    label: 'Play Again'
                                            }), overlayContainer);

    buttonPlay.on("click", function(){
      Q.input.trigger('playAgain');
    });

    stage.insert(new Q.UI.Text({x: 0, 
                                y: -Q.height*0.1,
                                size: SIZE_TITLE,
                                font: FONT_FAMILY,
                                algin: "center",
                                weight: WEIGHT_BOLD,
                                color: 'black',
                                label: "ROUND ENDED"
                              }), overlayContainer
    );
  }
});

Q.scene(SCENE_NOTIFICATION, function(stage){

  var msg = stage.options.msg;
  if(!msg){
    console.log("No message passed when creating notificationScreen");
    return;
  }

  var buttonH = Q.height/20;
  var msgArray = msg.split('\n');
  var maxMsgLength = 0;
  var msgLength;
  var msgCount = msgArray.length;

  for(var m in msgArray){
    msgLength = msgArray[m].length; 
    if(msgLength > maxMsgLength){
      maxMsgLength = msgLength;
    }
  }

  var container = stage.insert(new Q.UI.Container({ x: Q.width/2, 
                                                    y: Q.height/2,
                                                    fill: DARK_GREY
                                                  }));


  var buttons = stage.options.buttons;
  for(var b=0; buttons && b<buttons.length; b++){
    var bLen = buttons.length;
    var bW = Q.width/10;
    var bLabel = buttons[b].label;
    var bCallback = buttons[b].callback;

    var button = stage.insert(new Q.UI.Button({ x: -bLen*bW/2 + b*bW + bW/2, 
                                                y: 0,
                                                w: bW*0.8,
                                                h: buttonH,
                                                font: FONT_BOLD,
                                                fill: LIGHT_GREY,
                                                label: bLabel,
                                                callback: bCallback
                                          }), container);

    button.on("click", function(){

      if(this.p.callback) this.p.callback();

      container.destroy();
    }); 
  }

  var label = stage.insert(new Q.UI.Text({x: 0, 
                                          y: -SIZE_BOLD*msgCount - buttonH,
                                          size: SIZE_BOLD,
                                          font: FONT_FAMILY,
                                          algin: "center",
                                          weight: WEIGHT_NORMAL,
                                          color: LIGHT_GREY,
                                          label: msg
                                        }), container);

  container.fit(Q.height/20, Q.width/30);

});

Q.scene(SCENE_STATUS, function(stage){

  var msg = stage.options.msg;
  if(!msg){
    console.log("No message passed when creating statusScreen");
    return;
  }

  var container = stage.insert(new Q.UI.Container({ x: Q.width/2, 
                                                    y: Q.height/50,
                                                    fill: DARK_GREY
                                                  }));

  var label = container.insert(new Q.UI.Text({x: 0,
                                              y: 0, 
                                              size: SIZE_NORMAL,
                                              font: FONT_FAMILY,
                                              algin: "center",
                                              color: LIGHT_GREY,
                                              weight: WEIGHT_NORMAL,
                                              label: msg
                                            }));

  container.fit(UI_PADDING_VALUE, UI_PADDING_VALUE);
});