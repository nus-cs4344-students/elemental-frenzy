
Q.Sprite.extend("hudAttackIcon", {
  
  init: function(p, defaultP) {
    // merge p and defaultP, where attributes in p will override those in defaultP
    p = Q._defaults(p, defaultP);
    
    this._super(p, {
      sheet : 'icon_attack',
      frame : 0,
    });
});