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
var SCENE_HUD = 'hudScreen';


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

// welcome screen to allow player to choose characterSprites and sessionSprites
Q.scene(SCENE_WELCOME,function(stage) {

  // clear sessioned selected when the session is longer available
  if(welcomeSessionSelected && !sessions[welcomeSessionSelected]){
    welcomeSessionSelected = undefined;
  }

  var titleSize = Math.ceil(Q.height/20);
  titleSize -= titleSize%2;
  var boldSize = Math.ceil(Q.height/40);
  boldSize -= boldSize%2;
  var normalSize = Math.ceil(Q.height/50);
  normalSize -= normalSize%2;

  var titleWeight = 800;
  var boldWeight = 600;
  var normalWeight =  200;

  var boldFont = boldWeight +' '+boldSize+'px Arial';
  var normalFont = normalWeight+' '+normalSize+'px Arial';
 

  console.log(boldFont);
  console.log(normalFont);

  var title = stage.insert(new Q.UI.Text({  x:Q.width/2,
                                            y:Q.height/20,
                                            weight: titleWeight,
                                            size: titleSize,
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
                                                  w: Q.width/10,
                                                  h: Q.height/20,
                                                  label: 'Join',
                                                  font: boldFont,
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
                                                          y: 7*Q.height/11,
                                                          w: 3*Q.width/4,
                                                          h: Q.height/3,
                                                          fill: DARK_GREY
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
                                    font: normalFont,
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
                                                  weight: boldWeight,
                                                  size: boldSize,
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
                                              font: normalFont,
                                              fontColor: 'black',
                                              buttonId: numSession
                                            }));
  }

  sessionsSection.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);



  // characterSprites selection section
  var characterSection = stage.insert(new Q.UI.Container({x: Q.width/2, 
                                                          y: 4*Q.height/13,
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
    nameSprites[numChar] = new Q.UI.Text({ x:0,
                                    y: Math.max(20, Q.height/20),
                                    weight: normalWeight,
                                    size: normalSize,
                                    align: 'center',
                                    color: PLAYER_NAME_COLORS[numChar],
                                    label: PLAYER_NAMES[numChar]
                                  });
    numChar++;
  }


  // please choose your characterSprites
  var choicecharacterSprites = stage.insert(new Q.UI.Text({ x:characterSection.p.x,
                                                            y:characterSection.p.y - 3*characterSection.p.h/7,
                                                            weight: boldWeight,
                                                            size: boldSize,
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

Q.scene(SCENE_HUD, function(stage) {
  
  // session does not need to show element selector
  if(isSession){
    return;
  }

  var hudContainer = stage.insert(new Q.UI.Container({ x: Q.width/2, 
                                                       y: Q.height/10,
                                                       w: 9*Q.width/10,
                                                       h: Q.height/10,
                                                       fill: DARK_GREY
                                                      }));


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
                                                         angleStep: 0,
                                                         activeElement: element,
                                                         targetAngle: 0
                                                        }));

  selector.on('step', function(dt){

    var player = getPlayerSprite(selfId);
    if(player && this.p.activeElement != player.p.element){
      console.log("Element selector out of sync: player-"+player.p.element+" selector-"+this.p.activeElement);
      updateEleSelector(player.p.element);
    }

    var a = this.p.angle;
    var aStep = this.p.angleStep;
    var tAngle = this.p.targetAngle;

     if(aStep > 0 && Math.abs(a - tAngle) > 5){

        var aS = aStep * dt;
        var nextAngle = a - aS;

        if(nextAngle<0){
          nextAngle = 360 + nextAngle;
        }

        this.p.angle = Math.max(nextAngle % 360, 0);
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

    var targetAngle = ((ELEBALL_ELEMENTNAMES.length -nextElement) *90 )% 360;
    selector.p.targetAngle = targetAngle;
    selector.p.angleStep = Math.abs(targetAngle - selector.p.angle)/0.3;
    selector.p.activeElement = nextElement;
  };

  updateEleSelector(element);
  

  Q.input.on('hudNextElement', function(data){

    var currentPlayer = getPlayerSprite(selfId);
    if(!currentPlayer){
      console.log("Cannot locate current player during HUD element selector update");
      return;
    }
    var element = currentPlayer.p.element;

    updateEleSelector(element);
  });
});

Q.scene(SCENE_KILLED_INFO ,function(stage) {
  var kType = stage.options.killerEntityType;
  var kId = stage.options.killerId;
  var vType = stage.options.victimEntityType;
  var vId = stage.options.victimId;

  var kInfo = stage.insert(new Q.UI.Text({x: Q.width/2,
                                          y: Q.height/3,
                                          size: 20,
                                          align: 'center',
                                          color: 'black',
                                          label: ' ',
                                          countDown: 5,
                                          vx: 0,
                                          vy: -0.5
                                        }));

  var msg;
  if(kType && kId && vType && vId){
    if(!isSession){
      // client side
      msg = "You are killed by "+getSprite(kType,kId).p.name;

    }else{
      // session side
      msg = vType+" "+vId+" '"+getSprite(vType,vId).p.name+"' "+
            "is killed by "+kType+" "+kId+" '"+getSprite(kType,kId).p.name+"'";
    }
  }else{
    console.log("Insufficient killed info: "+getJSON(stage.options));
    return;
  }


  killedInfo.push(msg);
  killedInfoTimeLeft.push(3); // display for 3 second
  killedInfoPosition.push([0, -40]);

  kInfo.on('step', kInfo, function(dt){
    this.p.label = "Respawning in " + Math.floor(this.p.countDown);

    this.p.countDown -= dt;
    if(this.p.countDown < 0){
      this.destroy();
      return;
    }

    for (var i = 0; i < killedInfoTimeLeft.length; i++) {
      killedInfoTimeLeft[i] -= dt;
      
      if (killedInfoTimeLeft[i] <= 0) {
        // No need to display anymore, so remove it
        killedInfoTimeLeft.splice(i, 1);
        killedInfo.splice(i, 1);
        killedInfoPosition.splice(i, 1);console.log("remove kinfo");
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
  var scoreSize = (Q.width > 600) ? 24 : Math.ceil(Q.width / 30);

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
        x: 0,
        y: 0,
        size: scoreSize,
        align: "left"
      }), nameContainer);

  var killsTitle = stage.insert(new Q.UI.Text({ 
        label: "KILLS",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: 0,
        size: scoreSize,
        align: "left"
      }), killsContainer);
  

  var deathsTitle = stage.insert(new Q.UI.Text({ 
        label: "DEATHS",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: 0,
        size: scoreSize,
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
        size: scoreSize,
        align: "left"
      }), nameContainer);

      stage.insert(new Q.UI.Text({ 
        label: kills[name].toString(),
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: line*offsetY,
        size: scoreSize,
        align: "left"
      }), killsContainer);

      stage.insert(new Q.UI.Text({ 
        label: deaths[name].toString(),
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        //x, y coordinates here are relative to container, center = (0,0)
        x: 0,
        y: line*offsetY,
        size: scoreSize,
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