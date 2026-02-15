// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

// Store active animations to prevent duplication
const gifInstances = new Map();

THREE.GifTexture = function(url, callback) {
    // Create a unique canvas for THIS texture instance
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.isGIF = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Unique ID for this texture instance
    const instanceId = Math.random().toString(36).substring(7);
    texture.instanceId = instanceId;
    
    console.log(`GifTexture loading [${instanceId}]:`, url);
    console.log("gifler available:", typeof gifler !== 'undefined');
    
    // Check if gifler is available
    if (typeof gifler !== 'undefined') {
        try {
            console.log(`Attempting to load GIF with gifler [${instanceId}]`);
            
            // Create a NEW animator for EACH texture - DON'T reuse
            const animator = gifler(url);
            
            // Store the animator with this instance
            gifInstances.set(instanceId, {
                animator: animator,
                canvas: canvas,
                url: url
            });
            
            // Start animating - this updates the canvas directly
            animator.frames(canvas, (context, frame) => {
                // Update canvas dimensions if needed
                if (canvas.width !== frame.width || canvas.height !== frame.height) {
                    canvas.width = frame.width;
                    canvas.height = frame.height;
                    console.log(`Frame size [${instanceId}]: ${frame.width}x${frame.height}`);
                }
                
                // Draw the frame
                context.drawImage(frame.buffer, 0, 0);
                
                // Tell THREE.js the texture needs updating
                texture.needsUpdate = true;
                
                // Log first frame
                if (!texture._firstFrameLogged) {
                    console.log(`First GIF frame drawn successfully [${instanceId}]`);
                    texture._firstFrameLogged = true;
                    if (callback) callback(texture);
                }
            });
            
            // Store animator on texture
            texture.animator = animator;
            
            // Set a timeout to ensure callback happens even if GIF is weird
            setTimeout(() => {
                if (!texture._firstFrameLogged) {
                    console.log(`GIF timeout fallback [${instanceId}]`);
                    texture._firstFrameLogged = true;
                    if (callback) callback(texture);
                }
            }, 500);
            
        } catch (e) {
            console.error(`Error loading GIF with gifler [${instanceId}]:`, e);
            fallbackToStaticImage(url, texture, canvas, instanceId, callback);
        }
    } else {
        console.warn("gifler not loaded, using static image");
        fallbackToStaticImage(url, texture, canvas, 'static-' + instanceId, callback);
    }
    
    return texture;
};

function fallbackToStaticImage(url, texture, canvas, instanceId, callback) {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        texture.needsUpdate = true;
        console.log(`Static image loaded [${instanceId}]:`, url);
        if (callback) callback(texture);
    };
    img.onerror = (err) => {
        console.error(`Failed to load static image [${instanceId}]:`, url, err);
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

// Cleanup function for when textures are disposed
THREE.GifTexture.cleanup = function(texture) {
    if (texture && texture.instanceId && gifInstances.has(texture.instanceId)) {
        const instance = gifInstances.get(texture.instanceId);
        if (instance.animator && instance.animator.stop) {
            instance.animator.stop();
        }
        gifInstances.delete(texture.instanceId);
        console.log(`Cleaned up GIF instance: ${texture.instanceId}`);
    }
};

// Optional: Auto-cleanup when texture is disposed
const originalDispose = THREE.CanvasTexture.prototype.dispose;
THREE.CanvasTexture.prototype.dispose = function() {
    if (this.isGIF && this.instanceId) {
        THREE.GifTexture.cleanup(this);
    }
    if (originalDispose) {
        originalDispose.call(this);
    }
};
