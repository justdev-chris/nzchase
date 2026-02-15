// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

THREE.GifTexture = function(url, callback) {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    // Create texture from canvas immediately
    const texture = new THREE.CanvasTexture(canvas);
    texture.isGIF = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    console.log("GifTexture loading:", url);
    console.log("gifler available:", typeof gifler !== 'undefined');
    
    // Check if gifler is available
    if (typeof gifler !== 'undefined') {
        try {
            console.log("Attempting to load GIF with gifler");
            
            // Get the animator
            const animator = gifler(url);
            
            // Start animating - this updates the canvas directly
            animator.frames(canvas, (context, frame) => {
                // Update canvas dimensions if needed
                if (canvas.width !== frame.width || canvas.height !== frame.height) {
                    canvas.width = frame.width;
                    canvas.height = frame.height;
                    console.log(`Frame size: ${frame.width}x${frame.height}`);
                }
                
                // Draw the frame
                context.drawImage(frame.buffer, 0, 0);
                
                // CRITICAL: Tell THREE.js the texture needs updating
                texture.needsUpdate = true;
                
                // Log first frame to confirm it's working
                if (!texture._firstFrameLogged) {
                    console.log("First GIF frame drawn successfully");
                    texture._firstFrameLogged = true;
                    if (callback) callback(texture);
                }
            });
            
            // Store animator on texture to prevent garbage collection
            texture.animator = animator;
            
        } catch (e) {
            console.error("Error loading GIF with gifler:", e);
            fallbackToStaticImage(url, texture, canvas, callback);
        }
    } else {
        console.warn("gifler not loaded, using static image");
        fallbackToStaticImage(url, texture, canvas, callback);
    }
    
    return texture;
};

function fallbackToStaticImage(url, texture, canvas, callback) {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        texture.image = canvas;
        texture.needsUpdate = true;
        console.log("Static image loaded:", url);
        if (callback) callback(texture);
    };
    img.onerror = (err) => {
        console.error("Failed to load static image:", url, err);
        canvas.width = 64;
        canvas.height = 64;
        ctx.fillStyle = "#FF00FF";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px Arial";
        ctx.fillText("ERROR", 10, 30);
        texture.needsUpdate = true;
        if (callback) callback(texture);
    };
    img.src = url;
}

THREE.GifTexture.isGif = function(url) {
    return url && url.toLowerCase && url.toLowerCase().includes('.gif');
};

// OPTIONAL: Add a method to stop animation if needed
THREE.GifTexture.stopAnimation = function(texture) {
    if (texture && texture.animator && texture.animator.stop) {
        texture.animator.stop();
    }
};
