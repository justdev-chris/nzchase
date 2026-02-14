// Replace the GIF loading section with:
if (isGif && hasGifSupport && typeof THREE.GifTexture !== 'undefined') {
    // Load as GIF
    console.log(`Loading GIF for bot ${index}:`, url);
    THREE.GifTexture(url, (texture) => {
        if (texture) {
            createBotWithTexture(texture);
        } else {
            createFallbackBot(index, scene, nextbotsArray, botVelocitiesArray);
        }
    });
}
