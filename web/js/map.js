function TileMap(ctx, tileWidth, tileHeight, mapData) {
  var tileHalfWidth = (tileWidth / 2)|0
    , tileHalfHeight = (tileHeight / 2)|0
    , tileQtrHeight = (tileHeight / 4)|0
    , tileQtrWidth = (tileWidth / 4)|0;


  var tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileWidth + 2;
  tileCanvas.height = tileHeight * 2 + 2;
  var tc = tileCanvas.getContext('2d');
  var terrainSprites = new SpriteSheet('img/terrain.png', 16, 16);

  this.compose = function() {
    ctx.fillStyle = "#09f";
    ctx.fillRect(15,15,70,70);
    ctx.globalCompositeOperation = 'destination-atop';
    terrainSprites.draw(1, 20, 20);
    ctx.fillStyle = "#888";
    ctx.fillRect(15,15,70,70);
  }

  var tilePosition = this.tilePos = function(x, y) {
    return [ (tileWidth * x) + (y % 2) * tileHalfWidth
           , tileHalfHeight * y ];
  }

  var randChoice = function(arr) {
    if (arr === undefined || typeof arr === 'string') return arr;
    return arr[Math.random() * arr.length | 0];
  }

  var drawTile = this.drawTile = function(x, y, spec) {
    var sprite = Math.random() * 4 | 0;
    if (spec.img !== undefined) {
      tc.globalCompositeOperation = 'source-over';
      tc.fillStyle = randChoice(spec.fg) || 'black';
      tc.fillRect(0, 0, tileCanvas.width, tileCanvas.height);
      tc.globalCompositeOperation = 'destination-in';
      terrainSprites.draw(tc, sprite, spec.img, 1, 0, 32, 32);
    }
    var tilePos = tilePosition(x, y);
    ctx.beginPath();
    ctx.moveTo(tilePos[0] - tileHalfWidth - 1, tilePos[1]);
    ctx.lineTo(tilePos[0], tilePos[1] - tileHalfHeight - 1);
    ctx.lineTo(tilePos[0] + tileHalfWidth + 1, tilePos[1]);
    ctx.lineTo(tilePos[0], tilePos[1] + tileHalfHeight + 1);
    ctx.closePath();
    ctx.fillStyle = randChoice(spec.bg) || 'white';
    ctx.fill();

    if (spec.img !== undefined) {
      var spriteX = tilePos[0] - tileHalfWidth
        , spriteY =  tilePos[1] - tileHeight - tileHalfHeight - 1;
      if (spec.shadow) {
        ctx.globalAlpha = spec.shadow;
        terrainSprites.draw(ctx, sprite, spec.img, spriteX + 2, spriteY - 2, 32, 32);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(tileCanvas, spriteX, spriteY);
    }

    return tilePos;
  }

  var PIx2 = Math.PI * 2;

  var terrainSpec = {
      glacier: 'turquoise'
    , ocean: {fg:['#36a','#38a','#25b'], bg:'#139', img:0, shadow:0.25}
    , coast: {fg:['#7ae','#69d','#48b'], bg:['#24d','#23c','#14e'], img:0, shadow:0.25}
    , river: {fg:'#ccf', bg:'#36e', img:0, shadow:0.4}
    , grassland: {fg:'#5b4', bg:['#463','#353','#452'], img:7}
    , plains: {fg:'#db6', bg:['#552','#652','#663'], img:6}
    , desert: {fg:['#b97','#ba6','#cb8'], bg:'#dda', img:5}
    , jungle: {fg:['#164','#063','#272'], bg:'#143', img:3, shadow:0.7}
    , marsh: {fg:['#9b9','#8a4','#7a7'], bg:'#735', img:2, shadow:0.5}
    , tundra: {fg:'#fff', bg:'#eef', img:6, shadow:0.25}
    , taiga: {fg:['#186','#285','#175'], bg:'#997', img:8, shadow:0.7}
    , forest: {fg:['#062','#073','#272'], bg:'rgb(125,105,50)', img:4, shadow:0.6}
    , mountain: {fg:['#aaa','#cbc','#999'], bg:'#553', img:1, shadow:0.7}
    , 'mountain-tundra': {fg:['#eef','#eee','#dde'], bg:'#553', img:1, shadow:0.7}
  }

  var spriteMap = {
      mountain: 1
    , grassland: 3
  }

  var tileColor = function(x, y) {
    var col = mapData.tiles[x];
    if (col && col[y]) {
      var tile = col[y];
      return terrainSpec[tile.type] || terrainSpec[tile.biome] || 'pink';
    }
  }

  this.drawTiles = function(x, y, w, h) {
    ctx.save()
    var color, color2, color3, colorUp, tilePos, r;
    for (var ty = y; ty < (y + h); ty++) {
      for (var tx = x; tx < (x + w); tx++) {
        tilePos = drawTile(tx, ty, tileColor(tx, ty));
      }
    }

    ctx.restore()
  }

  this.drawTerrainSprites = function(x, y, w, h) {
    var tile, sprite, tilePos;
    for (var ty = y; ty < (y + h); ty++) {
      for (var tx = x; tx < (x + w); tx++) {
        tile = mapData.tiles[tx][ty];
        sprite = spriteMap[tile.type] || spriteMap[tile.biome];
        if (sprite) {
          tilePos = tilePosition(tx, ty);
          terrainSprites.draw(sprite, tilePos[0] - 12, tilePos[1] - 22, 24, 24);
        }
      }
    }
  }

  this.draw = function() {
    this.drawTiles(0, 0, 50, 200); //mapData.width, mapData.height);
  }
}
