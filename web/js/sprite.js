function SpriteSheet(imageSrc, spriteWidth, spriteHeight) {
  var sheet = this;
  var image = this.image = new Image();
  spriteWidth = spriteWidth || 32;
  spriteHeight = spriteHeight || 32;
  image.onload = function() {
    this.cols = image.width / spriteWidth | 0;
    this.rows = image.height /spriteHeight | 0;
    if (typeof sheet.onload === 'function') sheet.onload();
  }
  image.src = imageSrc;

  this.draw = function(ctx, sx, sy, x, y, w, h) {
    ctx.drawImage(image,
      sx * spriteWidth, sy * spriteHeight,
      spriteWidth, spriteHeight,
      x, y, w || spriteWidth, h || spriteHeight);
    /*
    console.log(image,
      sx * spriteWidth, sy * spriteHeight,
      spriteWidth, spriteHeight,
      x, y, w || spriteWidth, h || spriteHeight);
    */
  }
}
