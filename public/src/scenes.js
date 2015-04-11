"use strict";


// ## Stage constants (higher number will render OVER lower number)
var STAGE_BACKGROUND = 0;
var SCENE_BACKGROUND = 'background';
var STAGE_LEVEL = 1;
var SCENE_LEVEL = 'levelScreen';
var STAGE_WELCOME = 1;
var SCENE_WELCOME = 'welcomeScreen';
var STAGE_NOTIFICATION = 2;
var SCENE_NOTIFICATION = 'notificationScreen';

// Quintus do not trigger button click for stage higher than 2
var STAGE_SCORE = 3;
var SCENE_SCORE = 'scoreScreen';
var STAGE_HUD = 4;
var SCENE_HUD = 'hudScreen';
var STAGE_STATUS = 5;
var SCENE_STATUS = 'statusScreen';
var STAGE_INFO = 6;
var SCENE_INFO = 'infoScreen';
var STAGE_MINIMAP = 7;


// ## UI constants
var UI_OVERLAY_ALPHA_VALUE = 0.3;
var UI_TEXT_ALPHA_VALUE = 0.7;
var UI_PADDING_VALUE = 5; //in pixels
var LIGHT_GREY = "#CCCCCC";
var DARK_GREY = "rgba(0,0,0,0.5)";


var welcomeCharSelected;
var welcomeSessionSelected;
var isWelcomeSelectedSessionFull;
var isWelcomeSelectedCharInUse;

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

var FONT_BOLD = WEIGHT_BOLD +' '+SIZE_BOLD+'px '+FONT_FAMILY;
var FONT_NORMAL = WEIGHT_NORMAL+' '+SIZE_NORMAL+'px '+FONT_FAMILY;

var WIDTH_HUD = 9*Q.width/10;
var HEIGH_HUD = Q.height/10;

// HUD constants
var HUD_ACTIVE_DOUBLE_DMG = "icon_attack_active";
var HUD_ACTIVE_DOUBLE_MOVESPEED = "icon_movement_active";
var HUD_ACTIVE_ZERO_MANA_COST = "icon_mana_active";
var HUD_INACTIVE_DOUBLE_DMG = "icon_attack_inactive";
var HUD_INACTIVE_DOUBLE_MOVESPEED = "icon_movement_inactive";
var HUD_INACTIVE_ZERO_MANA_COST = "icon_mana_inactive";

var STATS_OFFSET = 25;

// welcome screen to allow player to choose characterSprites and sessionSprites
Q.scene(SCENE_WELCOME,function(stage) {

  // clear sessioned selected when the session is longer available
  if(welcomeSessionSelected && !sessions[welcomeSessionSelected]){
    welcomeSessionSelected = undefined;
  }

  var title = stage.insert(new Q.UI.Text({  x:Q.width/2,
                                            y:Q.height/20,
                                            weight: WEIGHT_TITLE,
                                            size: SIZE_TITLE,
                                            font: FONT_FAMILY,
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
    nameSprites[numChar] = new Q.UI.Text({x:0,
                                          y: Math.max(20, Q.height/20),
                                          weight: WEIGHT_NORMAL,
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

Q.scene('level2',function(stage) {

  // Add in a tile layer, and make it the collision layer
  stage.collisionLayer(new Q.TileLayer({dataAsset: 'level2.json',
                                            sheet: 'tiles' })
  );
});

Q.scene(SCENE_LEVEL, function(stage) {

  var backgroundStage = Q.stage(STAGE_BACKGROUND);
  var miniStage = stage.options.miniStage;
  var mapStage = Q.stage(miniStage);

  var level = stage.options.level;

  if(miniStage && mapStage){
    
    // postrender is trigger after all the items in the stage is renderred according to the viewport if it exists
    mapStage.on("postrender", function(ctx){

      // call viewport to push matrix and translate and scale if viewport exists
      stage.trigger('prerender', ctx);

      var vp = stage.viewport;
      var vpScale = 0.1;
      var screenW = Q.width/3;
      var screenH = Q.height/3;
      var startX, startY, endX, endY;

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
      }

      // render miniStage
      var mapVp = mapStage.viewport;
      for(var i=0,len=mapStage.items.length;i<len;i++) {
        var item = mapStage.items[i];
        // Don't render sprites with containers (sprites do that themselves)
        // Also don't render if not onscreen

        var isWithinX;
        var isWithinY;

        // collision layer (titleLayer will calculate itself int its render() method by taking viewport setting into account)
        if(item.p && !item.collisionLayer && vp && startX && startY && endX && endY){
          isWithinX = startX <= item.p.x && endX >= item.p.x;
          isWithinY = startY <= item.p.y && endY >= item.p.y;
        }

        if(!item.container && (item.p.renderAlways || item.mark >= mapStage.time ||(isWithinX && isWithinY))) {
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
                                            sheet: 'tiles' })
  );
  }
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
                                                       y: 11*Q.height/100,
                                                       w: WIDTH_HUD,
                                                       h: HEIGH_HUD,
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
    
    if(aNeeded >= aShifted){

      // console.log("aNeeded "+aNeeded+" aShifted "+aShifted+" tAngle "+tAngle+" angle "+a);
      
      var aS = aStep * dt;
      this.p.angleShifted += aS;
      if(this.p.angleShifted > this.p.angleNeeded){
        aS = this.p.angleNeeded - (this.p.angleShifted - aS);
        this.p.angleShifted = this.p.angleNeeded;
      }
      var nextAngle = a - aS;

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
    var angleNeeded = selector.p.angle - targetAngle;
    
    if(angleNeeded < 0){
      angleNeeded = 360 + angleNeeded;
    }

    selector.p.targetAngle = targetAngle;
    selector.p.angleNeeded = angleNeeded;
    selector.p.angleStep = angleNeeded/0.3;
    selector.p.angleShifted = 0;
    selector.p.activeElement = nextElement;

    // console.log("tAngle "+targetAngle+" a "+selector.p.angle+" angleNeeded "+angleNeeded);
  };

  updateEleSelector(element);

  var initHud = true;
  var powerupMana_ZeroMana;
  var powerupAtk_DoubleDmg;
  var powerupMovement_150SPEED;

  hudContainer.on('draw', hudContainer, function(ctx) {

    var currentPlayer = getPlayerSprite(selfId);
    if(!currentPlayer) {
      console.log("Cannot locate current player during HUD player attribute drawing");
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

    var currentHp = currentPlayer.p.currentHealth;
    var maxHp     = currentPlayer.p.maxHealth;
    var scaledHp  = currentHp / maxHp;

    //green -> yellow -> red
    var color       = scaledHp > 0.5 ? '#00FF00' : scaledHp > 0.2 ? '#FFFF00' : '#FF0000';
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    var centerX     = 3*this.p.w/15;
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
    centerX         = 5*this.p.w/15;
    centerY         = 0;

    drawHollowCircleWithTextInside(currentMana, maxMana, centerX, centerY, radius, ctx);

    //icon sprites are 34 by 34. ideal case is scale their height to this.p.h / 3
    var scaleIcons = this.p.h / 3 / 34;
    /*
    ** Mana cost per shot
    ** represented by a light blue line with blue text beside
    */

    //("inherits" blue color from above, since this is right after drawing mana circle)
    centerX         = selector.p.x - eleW / 1.2;
    centerY         = selector.p.y;
    var manaPerShot = currentPlayer.p.manaPerShot;
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
    var damagePerShot = currentPlayer.p.dmg;
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
    var moveSpeed   = currentPlayer.p.speed;
    ctx.font        = WEIGHT_BOLD + " " +"12px "+FONT_FAMILY;

    ctx.fillText(moveSpeed, centerX + STATS_OFFSET, centerY - 6);

    if (initHud) {
      this.insert(new Q.UI.Button({ sheet: HUD_ACTIVE_DOUBLE_MOVESPEED,
                                    x    : centerX,
                                    y    : centerY,
                                    scale: scaleIcons
                                  }));
    }
    

    centerX = 34;
    centerY = 0;

    var scaleToHeight = this.p.h > 34 ? 1 : this.p.h / 34;

    if (initHud) {
      powerupMana_ZeroMana        = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_ZERO_MANA_COST,
                                                                  x    : 0 * scaleToHeight,
                                                                  y    : centerY,
                                                                  scale: scaleToHeight,
                                    }));
      powerupAtk_DoubleDmg        = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_DOUBLE_DMG,
                                                                  x    : 34 * scaleToHeight,
                                                                  y    : centerY,
                                                                  scale: scaleToHeight
                                    }));
      powerupMovement_150SPEED = this.insert(new Q.UI.Button({ sheet: HUD_INACTIVE_DOUBLE_MOVESPEED,
                                                                  x    : 68 * scaleToHeight,
                                                                  y    : centerY,
                                                                  scale: scaleToHeight
                                    }));
    } else {
      var isZeroManaActive        = currentPlayer.p.powerupsHeld[POWERUP_CLASS_MANA_ZEROMANACOST];
      var isDoubleDmgActive       = currentPlayer.p.powerupsHeld[POWERUP_CLASS_ATTACK_DOUBLEDMG];
      var isDoubleMovespeedActive = currentPlayer.p.powerupsHeld[POWERUP_CLASS_MOVESPEED_150SPEED];
      
      powerupMana_ZeroMana.p.sheet        = isZeroManaActive ? HUD_ACTIVE_ZERO_MANA_COST          : HUD_INACTIVE_ZERO_MANA_COST;
      powerupAtk_DoubleDmg.p.sheet        = isDoubleDmgActive ? HUD_ACTIVE_DOUBLE_DMG             : HUD_INACTIVE_DOUBLE_DMG;
      powerupMovement_150SPEED.p.sheet = isDoubleMovespeedActive ? HUD_ACTIVE_DOUBLE_MOVESPEED : HUD_INACTIVE_DOUBLE_MOVESPEED;
    }

    initHud = false;

  });

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
                                          y: Q.height/3,
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
  infoPositionList.push([0, -40]);

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
    ctx.font = SIZE_BOLD+"px "+FONT_FAMILY;
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
  //every line takes about 30 pixels
  var offsetY = scoreSize*1.5;

  /*
  ** Set up UI containers
  */
  var overlayContainer = stage.insert(new Q.UI.Container({
      fill: "rgba(1,1,1,"+UI_OVERLAY_ALPHA_VALUE+")",
      border: 5,
      x: Q.width/2,
      y: 11*Q.height/50,
      w: WIDTH_HUD
    }));
  
  var nameContainer = stage.insert(new Q.UI.Container({ 
        label: "PLAYER NAME",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: -overlayContainer.p.w/3,
        y: 0
      }),overlayContainer);

  var killsContainer = stage.insert(new Q.UI.Container({ 
        x: 0,
        y: 0
      }),overlayContainer);

  var deathsContainer = stage.insert(new Q.UI.Container({ 
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
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
        x: 0,
        y: 0,
        font: FONT_FAMILY,
        align: "center"
      }), overlayContainer);

  var nameTitle = stage.insert(new Q.UI.Text({ 
        label: "PLAYER NAME",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: 0,
        size: scoreSize,
        font: FONT_FAMILY,
        align: "left"
      }), nameContainer);

  var killsTitle = stage.insert(new Q.UI.Text({ 
        label: "KILLS",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: 0,
        size: scoreSize,
        font: FONT_FAMILY,
        align: "center"
      }), killsContainer);
  

  var deathsTitle = stage.insert(new Q.UI.Text({ 
        label: "DEATHS",
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: 0,
        size: scoreSize,
        font: FONT_FAMILY,
        align: "right"
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
        label: name,
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: line*offsetY,
        size: scoreSize,
        font: FONT_FAMILY,
        align: "left"
      }), nameContainer);

      stage.insert(new Q.UI.Text({ 
        label: kills[name].toString(),
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: line*offsetY,
        size: scoreSize,
        font: FONT_FAMILY,
        align: "center"
      }), killsContainer);

      stage.insert(new Q.UI.Text({ 
        label: deaths[name].toString(),
        color: "rgba(1,1,1,"+UI_TEXT_ALPHA_VALUE+")",
        x: 0,
        y: line*offsetY,
        size: scoreSize,
        font: FONT_FAMILY,
        align: "right"
      }), deathsContainer);

      ++line;
  }
  
  //padding between stuff in container and border of container
  nameContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  killsContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  deathsContainer.fit(UI_PADDING_VALUE,UI_PADDING_VALUE);
  overlayContainer.fit(2*UI_PADDING_VALUE, UI_PADDING_VALUE);
});

Q.scene(SCENE_NOTIFICATION, function(stage){

  var msg = stage.options.msg;
  var callback = stage.options.callback;

  if(!msg){
    console.log("No message passed when creating notificationScreen");
    return;
  }

  var buttonOkH = Q.height/20;
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


    var buttonOk = stage.insert(new Q.UI.Button({ x: 0, 
                                                  y: 0,
                                                  w: container.p.w/3,
                                                  h: buttonOkH,
                                                  font: FONT_BOLD,
                                                  fill: LIGHT_GREY,
                                                  label: 'OK'
                                            }), container);

    buttonOk.on("click", function(){
      
      if(callback) callback();

      container.destroy();
    }); 

  var label = stage.insert(new Q.UI.Text({x: 0, 
                                          y: -SIZE_BOLD*msgCount - buttonOkH,
                                          size: SIZE_BOLD,
                                          font: FONT_FAMILY,
                                          algin: "center",
                                          weight: WEIGHT_NORMAL,
                                          color: LIGHT_GREY,
                                          label: msg
                                        }), container);

  // button is shown, increase message box size
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