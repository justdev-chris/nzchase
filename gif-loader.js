// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

THREE.GifTexture = function(url, callback) {
    const texture = new THREE.Texture();
    texture.isGIF = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Check if gifler is available
    if (typeof gifler !== 'undefined') {
        gifler(url).frames(canvas, (context, frame) => {
            // Update canvas dimensions if needed
            if (canvas.width !== frame.width || canvas.height !== frame.height) {
                canvas.width = frame.width;
                canvas.height = frame.height;
            }
            
            // Draw the frame
            context.drawImage(frame.buffer, 0, 0);
            texture.needsUpdate = true;
            
            // Set image reference for aspect ratio calculation
            if (!texture.image) {
                texture.image = canvas;
            }
        });
        
        // Small delay to let first frame load
        setTimeout(() => {
            texture.image = canvas;
            if (callback) callback(texture);
        }, 100);
    } else {
        console.warn("gifler not loaded, using static image");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            texture.image = canvas;
            texture.needsUpdate = true;
            if (callback) callback(texture);
        };
        img.src = url;
    }
    
    return texture;
};

THREE.GifTexture.isGif = function(url) {
    return url.toLowerCase().includes('.gif');
};
