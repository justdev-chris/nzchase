// ========== NEXTBOTS.JS - NEXTBOT MANAGER ==========

let nextbotSoundIntervals = [];
let activeSounds = [];

function createAllNextbots(imageURLs, scene, nextbotsArray, botVelocitiesArray) {
    console.log("Creating nextbots...");
    
    if (!imageURLs || imageURLs.length === 0) {
        console.log("No nextbot images");
        return;
    }
    
    const texLoader = new THREE.TextureLoader();
    
    imageURLs.forEach((url, index) => {
        texLoader.load(url, 
            function(texture) {
                const aspect = texture.image.width / texture.image.height;
                const botGeometry = new THREE.PlaneGeometry(6 * aspect, 6);
                const botMaterial = new THREE.MeshLambertMaterial({ 
                    map: texture, 
                    transparent: true,
                    side: THREE.DoubleSide
                });
                
                const bot = new THREE.Mesh(botGeometry, botMaterial);
                
                // Spawn at random position
                const angle = Math.random() * Math.PI * 2;
                const radius = 15 + Math.random() * 20;
                bot.position.set(
                    Math.cos(angle) * radius,
                    30,
                    Math.sin(angle) * radius
                );
                
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0
                };
                
                bot.castShadow = true;
                bot.receiveShadow = true;
                scene.add(bot);
                
                nextbotsArray.push(bot);
                botVelocitiesArray.push(0);
                console.log(`Bot ${index} spawned`);
            },
            undefined,
            function(error) {
                console.log("Texture failed, using cube");
                const botGeometry = new THREE.BoxGeometry(3, 3, 3);
                const botMaterial = new THREE.MeshLambertMaterial({ color: 0xff00ff });
                const bot = new THREE.Mesh(botGeometry, botMaterial);
                
                const angle = Math.random() * Math.PI * 2;
                const radius = 15 + Math.random() * 20;
                bot.position.set(
                    Math.cos(angle) * radius,
                    30,
                    Math.sin(angle) * radius
                );
                
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0
                };
                
                scene.add(bot);
                nextbotsArray.push(bot);
                botVelocitiesArray.push(0);
            }
        );
    });
    
    document.getElementById('nextbot-count').textContent = nextbotsArray.length;
}

function setupNextbotSounds() {
    console.log("Setting up nextbot sounds");
    
    // Clear any existing intervals
    nextbotSoundIntervals.forEach(interval => clearInterval(interval));
    nextbotSoundIntervals = [];
    
    // Check each bot every 2 seconds
    const interval = setInterval(() => {
        if (!window.nextbots || !window.nextbotAudio || !camera) return;
        if (!audioContext || audioContext.state !== 'running') return;
        
        window.nextbots.forEach((bot, index) => {
            if (!bot) return;
            
            const dist = bot.position.distanceTo(camera.position);
            const now = Date.now();
            
            // Only play if within 20 units and not spamming (min 3 seconds between sounds)
            if (dist <= 20 && (now - bot.userData.lastSoundTime) > 3000) {
                playBotSound(bot, dist);
            }
        });
    }, 2000);
    
    nextbotSoundIntervals.push(interval);
}

function playBotSound(bot, distance) {
    const soundIndex = bot.userData.soundIndex;
    
    if (soundIndex >= window.nextbotAudio.length || !window.nextbotAudio[soundIndex]) {
        console.log(`No sound for bot ${soundIndex}`);
        return;
    }
    
    try {
        const soundBuffer = window.nextbotAudio[soundIndex].buffer;
        if (!soundBuffer) {
            console.log(`No buffer for bot ${soundIndex}`);
            return;
        }
        
        // Calculate volume based on distance
        let volume = 0;
        if (distance <= 10) {
            volume = 1.0; // Full volume within 10 units
        } else if (distance <= 16) {
            volume = 0.6; // 60% volume at 11-16 units
        } else {
            volume = 0.0; // Silent beyond 20 units (already filtered)
        }
        
        console.log(`Playing sound for bot ${soundIndex} at distance ${distance.toFixed(1)}, volume ${volume}`);
        
        // Create and play sound
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffer;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(sfxGain);
        
        source.onended = () => {
            // Remove from active sounds
            activeSounds = activeSounds.filter(s => s.source !== source);
        };
        
        source.start();
        
        // Track active sound
        activeSounds.push({
            source: source,
            gainNode: gainNode,
            bot: bot
        });
        
        bot.userData.lastSoundTime = Date.now();
        
    } catch (e) {
        console.error("Error playing sound:", e);
    }
}

function updateNextbots(camera, playerHealth, isDead, showDeathScreen, baseBotSpeed, botSpeedMultiplier) {
    if (!window.nextbots || !window.botVelocities) {
        return;
    }
    
    const mapModel = window.currentMapModel || currentMapModel;
    if (!mapModel) return;
    
    const currentBotSpeed = baseBotSpeed * botSpeedMultiplier;
    const gravity = -0.03;
    
    window.nextbots.forEach((bot, index) => {
        if (!bot) return;
        
        // Gravity
        if (window.botVelocities[index] === undefined) window.botVelocities[index] = 0;
        window.botVelocities[index] += gravity;
        bot.position.y += window.botVelocities[index];
        
        // Ground collision
        const downRay = new THREE.Raycaster(
            new THREE.Vector3(bot.position.x, bot.position.y + 10, bot.position.z),
            new THREE.Vector3(0, -1, 0),
            0,
            200
        );
        
        const groundHits = downRay.intersectObject(mapModel, true);
        
        if (groundHits.length > 0) {
            const groundY = groundHits[0].point.y;
            const botHeight = 2;
            
            if (bot.position.y <= groundY + botHeight) {
                bot.position.y = groundY + botHeight;
                window.botVelocities[index] = 0;
            }
        } else if (bot.position.y < -50) {
            bot.position.y = 10;
            window.botVelocities[index] = 0;
        }
        
        // Move toward player
        const dir = new THREE.Vector3();
        dir.subVectors(camera.position, bot.position).normalize();
        dir.y = 0;
        
        if (dir.length() > 0.1) {
            bot.position.x += dir.x * currentBotSpeed;
            bot.position.z += dir.z * currentBotSpeed;
        }
        
        bot.lookAt(camera.position);
        
        // Insta-kill
        const dist = bot.position.distanceTo(camera.position);
        if (dist < 4) {
            window.playerHealth = 0;
            document.getElementById('health').textContent = '0';
            if (!isDead) showDeathScreen();
        }
    });
}

function cleanupNextbotSounds() {
    nextbotSoundIntervals.forEach(interval => clearInterval(interval));
    nextbotSoundIntervals = [];
    
    activeSounds.forEach(sound => {
        if (sound.source) {
            try { sound.source.stop(); } catch (e) {}
        }
    });
    activeSounds = [];
}
