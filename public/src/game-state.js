"use strict";

// ## Game State
Q.state.reset({
  kills : [],
  deaths : []
});
// # Set listeners for the game state
// # When player dies, update the kills of the killer and the deaths of the victim
Q.state.on("playerDied", function(data) {
  var victim = data.victim,
    killer = data.killer;
  console.log("State log: victim " + victim + " killer " + killer);
  if (typeof Q.state.p.kills[killer] === 'undefined') {
    Q.state.p.kills[killer] = 0;
  }
  if (typeof Q.state.p.deaths[victim] === 'undefined') {
    Q.state.p.deaths[victim] = 0;
  }
  Q.state.p.kills[killer]++;
  Q.state.p.deaths[victim]++;
  console.log("Kills for player " + killer + " is " + Q.state.p.kills[killer]);
  console.log("Deaths for player " + victim + " is " + Q.state.p.deaths[victim]);
});
// # When enemy dies, update the kills of the killer only
Q.state.on("enemyDied", function(killer) {
  if (typeof killer === 'undefined') {
    return;
  }
  
  if (typeof Q.state.p.kills[killer] === 'undefined') {
    Q.state.p.kills[killer] = 0;
  }
  Q.state.p.kills[killer]++;
  console.log("Kills for player " + killer + " is " + Q.state.p.kills[killer]);
});