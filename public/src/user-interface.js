"use strict";

// ## UI constants
var UI_OVERLAY_ALPHA_VALUE = 0.3;
var UI_TEXT_ALPHA_VALUE = 0.7;
var UI_PADDING_VALUE = 20; //in pixels

Q.el.addEventListener('keyup',function(e) {
  //9 == TAB KEY
  if (e.keyCode == 9) {
    //Q.clearStage(STAGE_UI);
  }
});

Q.el.addEventListener('keydown',function(e) {
  //9 == TAB KEY
  if (e.keyCode == 9) {
    //Q.clearStage(STAGE_UI);
    //Q.stageScene("scoreScreen", STAGE_UI); 
  }
});

Q.scene('scoreScreen', function(stage) {
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
})