// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

THREE.GifTexture = function(url, callback) {
    const texture = new THREE.Texture();
    texture.isGIF = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set initial canvas size
    canvas.width = 64;
    canvas.height = 64;
    
    // Store the animator to prevent garbage collection
    let animator = null;
    
    // Check if gifler is available
    if (typeof gifler !== 'undefined') {
        // Get the animator
        animator = gifler(url);
        
        // Start animating
        animator.frames(canvas, (context, frame) => {
            // Update canvas dimensions if needed
            if (canvas.width !== frame.width || canvas.height !== frame.height) {
                canvas.width = frame.width;
                canvas.height = frame.height;
            }
            
            // Draw the frame
            context.drawImage(frame.buffer, 0, 0);
            
            // CRITICAL FIX: Update texture and mark for rendering
            texture.image = canvas;
            texture.needsUpdate = true;
            
            // Set min/mag filters for better quality
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
        });
        
        // Store animator on texture to prevent garbage collection
        texture.animator = animator;
        
        // Small delay to let first frame load
        setTimeout(() => {
            texture.image = canvas;
            texture.needsUpdate = true;
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

// OPTIONAL: Add a method to stop animation if needed
THREE.GifTexture.stopAnimation = function(texture) {
    if (texture && texture.animator && texture.animator.stop) {
        texture.animator.stop();
    }
};
