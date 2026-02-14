// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

THREE.GifTexture = function(url, callback) {
    const texture = new THREE.Texture();
    texture.isGIF = true;
    
    const canvas = document.createElement('canvas');
    
    // Use gifler to parse the GIF
    gifler(url).frames(canvas, (ctx, frame) => {
        texture.image = canvas;
        texture.needsUpdate = true;
    });
    
    if (callback) callback(texture);
    return texture;
};

THREE.GifTexture.isGif = function(url) {
    return url.toLowerCase().includes('.gif');
};
