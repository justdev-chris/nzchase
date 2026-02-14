// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

THREE.GifTexture = function(src, callback) {
    const texture = new THREE.Texture();
    texture.isGIF = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Check if it's a GIF by looking at the first few bytes
        const isGif = src.toLowerCase().includes('.gif') || 
                     (img.src.indexOf('data:image/gif') === 0);
        
        if (isGif && typeof window.supergif !== 'undefined') {
            // Use libgif for animated GIFs
            const gif = new supergif({
                gif: img,
                auto_play: true,
                loop_delay: 0,
                show_progress_bar: false
            });
            
            gif.load(() => {
                canvas.width = gif.get_width();
                canvas.height = gif.get_height();
                
                function animateGif() {
                    if (!texture._gifActive) return;
                    gif.move_next();
                    ctx.drawImage(gif.getCanvas(), 0, 0);
                    texture.needsUpdate = true;
                    requestAnimationFrame(animateGif);
                }
                
                texture._gifActive = true;
                animateGif();
                
                if (callback) callback(texture);
            });
        } else {
            // Static image
            ctx.drawImage(img, 0, 0);
            texture.image = canvas;
            texture.needsUpdate = true;
            if (callback) callback(texture);
        }
    };
    
    img.onerror = function() {
        console.error("Failed to load image:", src);
        if (callback) callback(null);
    };
    
    return texture;
};

// Update all GIF textures (call in animation loop)
THREE.GifTexture.update = function() {
    // Nothing needed here as each GIF handles its own animation
};

// Check if a URL is a GIF
THREE.GifTexture.isGif = function(url) {
    return url.toLowerCase().includes('.gif') || 
           url.indexOf('data:image/gif') === 0;
};