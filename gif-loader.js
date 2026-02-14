// ========== GIF-LOADER.JS - THREE.js GIF Support ==========

(function() {
    // Check if libgif is available
    if (typeof supergif === 'undefined') {
        console.warn("libgif.js not loaded - GIFs will be static");
    }

    THREE.GifTexture = function(url, callback) {
        const texture = new THREE.Texture();
        texture.isGIF = true;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Check if it's a GIF
            const isGif = url.toLowerCase().includes('.gif') || 
                         (img.src.indexOf('data:image/gif') === 0);
            
            if (isGif && typeof supergif !== 'undefined') {
                // Create GIF player
                const gif = new supergif({
                    gif: img,
                    auto_play: true,
                    loop_delay: 0,
                    show_progress_bar: false
                });
                
                gif.load(() => {
                    canvas.width = gif.get_width();
                    canvas.height = gif.get_height();
                    
                    // Initial draw
                    ctx.drawImage(gif.getCanvas(), 0, 0);
                    texture.image = canvas;
                    texture.needsUpdate = true;
                    
                    // Animation loop for this specific GIF
                    function animateGif() {
                        if (!texture._gifActive) return;
                        
                        if (gif.get_current_frame() >= gif.get_length() - 1) {
                            gif.move_to(0);
                        } else {
                            gif.move_next();
                        }
                        
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
            console.error("Failed to load GIF:", url);
            if (callback) callback(null);
        };
        
        img.src = url;
        
        return texture;
    };

    THREE.GifTexture.isGif = function(url) {
        return url.toLowerCase().includes('.gif') || 
               (url && url.indexOf('data:image/gif') === 0);
    };
})();
