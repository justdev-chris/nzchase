// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

THREE.GifTexture = function(url, callback) {
    const texture = new THREE.Texture();
    texture.isGIF = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set initial canvas size
    canvas.width = 64;
    canvas.height = 64;
    
    // Debug: Check if gifler is available
    console.log("GifTexture loading:", url);
    console.log("gifler available:", typeof gifler !== 'undefined');
    
    // Check if gifler is available
    if (typeof gifler !== 'undefined') {
        try {
            console.log("Attempting to load GIF with gifler");
            
            // Get the animator
            const animator = gifler(url);
            
            // Start animating
            animator.frames(canvas, (context, frame) => {
                // Update canvas dimensions if needed
                if (canvas.width !== frame.width || canvas.height !== frame.height) {
                    canvas.width = frame.width;
                    canvas.height = frame.height;
                    console.log(`Frame size: ${frame.width}x${frame.height}`);
                }
                
                // Draw the frame
                context.drawImage(frame.buffer, 0, 0);
                
                // CRITICAL FIX: Update texture and mark for rendering
                texture.image = canvas;
                texture.needsUpdate = true;
                
                // Set min/mag filters for better quality
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                // Log first frame to confirm it's working
                if (!texture._firstFrameLogged) {
                    console.log("First GIF frame drawn successfully");
                    texture._firstFrameLogged = true;
                }
            });
            
            // Store animator on texture to prevent garbage collection
            texture.animator = animator;
            
            // Small delay to let first frame load
            setTimeout(() => {
                texture.image = canvas;
                texture.needsUpdate = true;
                console.log("GIF texture ready");
                if (callback) callback(texture);
            }, 100);
        } catch (e) {
            console.error("Error loading GIF with gifler:", e);
            fallbackToStaticImage(url, texture, canvas, ctx, callback);
        }
    } else {
        console.warn("gifler not loaded, using static image");
        fallbackToStaticImage(url, texture, canvas, ctx, callback);
    }
    
    return texture;
};

function fallbackToStaticImage(url, texture, canvas, ctx, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Handle CORS if needed
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
        // Create a fallback colored texture
        canvas.width = 64;
        canvas.height = 64;
        ctx.fillStyle = "#FF00FF";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px Arial";
        ctx.fillText("ERROR", 10, 30);
        texture.image = canvas;
        texture.needsUpdate = true;
        if (callback) callback(texture);
    };
    img.src = url;
}

THREE.GifTexture.isGif = function(url) {
    return url.toLowerCase().includes('.gif');
};

// OPTIONAL: Add a method to stop animation if needed
THREE.GifTexture.stopAnimation = function(texture) {
    if (texture && texture.animator && texture.animator.stop) {
        texture.animator.stop();
    }
};
