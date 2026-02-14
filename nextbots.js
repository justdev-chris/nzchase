// ========== NEXTBOTS.JS - NEXTBOT MANAGER ==========

let nextbotSoundIntervals = [];
let activeSounds = new Map(); // Track active sounds per bot

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
                
                // UNIQUE BOT PERSONALITY - each bot behaves differently
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0,
                    isPlayingSound: false,
                    
                    // Movement personality traits
                    aggression: 0.5 + Math.random() * 0.8, // 0.5-1.3 - how directly they chase
                    wanderFreq: 0.5 + Math.random() * 2.0, // 0.5-2.5 - how fast they wander side to side
                    wanderAmp: 0.2 + Math.random() * 0.8, // 0.2-1.0 - how wide they wander
                    sideBias: (Math.random() - 0.5) * 1.5, // -0.75 to 0.75 - prefer left/right
                    
                    // Visual personality (optional)
                    color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5) // For debug
                };
                
                bot.castShadow = true;
                bot.receiveShadow = true;
                scene.add(bot);
                
                nextbotsArray.push(bot);
                botVelocitiesArray.push(0);
                console.log(`Bot ${index} spawned with aggression ${bot.userData.aggression.toFixed(2)}`);
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
                    lastSoundTime: 0,
                    isPlayingSound: false,
                    aggression: 0.5 + Math.random() * 0.8,
                    wanderFreq: 0.5 + Math.random() * 2.0,
                    wanderAmp: 0.2 + Math.random() * 0.8,
                    sideBias: (Math.random() - 0.5) * 1.5
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
    activeSounds.clear();
}

function playBotSoundIfClose(bot, camera) {
    const soundIndex = bot.userData.soundIndex;
    
    // Don't play if this bot is already playing a sound
    if (bot.userData.isPlayingSound) return;
    
    // Calculate 2D distance
    const dx = camera.position.x - bot.position.x;
    const dz = camera.position.z - bot.position.z;
    const dist2D = Math.sqrt(dx*dx + dz*dz);
    
    // Check if within range and not spamming
    const now = Date.now();
    const timeSinceLastSound = now - bot.userData.lastSoundTime;
    
    if (dist2D <= 20 && timeSinceLastSound > 3000) {
        if (soundIndex >= window.nextbotAudio.length || !window.nextbotAudio[soundIndex]) {
            return;
        }
        
        try {
            const soundBuffer = window.nextbotAudio[soundIndex].buffer;
            if (!soundBuffer) return;
            
            // Create sound with gain node that we can update
            const source = audioContext.createBufferSource();
            source.buffer = soundBuffer;
            
            const gainNode = audioContext.createGain();
            
            // Set initial volume
            const volume = calculateVolume(dist2D);
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(sfxGain);
            
            // Mark as playing
            bot.userData.isPlayingSound = true;
            bot.userData.lastSoundTime = now;
            
            // Store gain node for volume updates
            activeSounds.set(bot, {
                source: source,
                gainNode: gainNode,
                startTime: now,
                lastVolume: volume
            });
            
            // When sound ends
            source.onended = () => {
                bot.userData.isPlayingSound = false;
                activeSounds.delete(bot);
            };
            
            source.start();
            
            console.log(`Bot ${soundIndex} started sound at ${dist2D.toFixed(1)} units`);
            
        } catch (e) {
            console.error("Error playing sound:", e);
            bot.userData.isPlayingSound = false;
        }
    }
}

function calculateVolume(distance) {
    if (distance <= 10) return 1.0;
    if (distance <= 16) return 0.6;
    if (distance <= 20) return 0.6 * (1 - (distance - 16) / 4);
    return 0.0;
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
        
        // === UPDATE VOLUME OF ACTIVE SOUNDS IN REAL-TIME ===
        if (activeSounds.has(bot)) {
            const soundData = activeSounds.get(bot);
            
            // Calculate current 2D distance
            const dx = camera.position.x - bot.position.x;
            const dz = camera.position.z - bot.position.z;
            const dist2D = Math.sqrt(dx*dx + dz*dz);
            
            // Update gain node volume
            const newVolume = calculateVolume(dist2D);
            soundData.gainNode.gain.value = newVolume;
            
            // Log if volume changed significantly
            if (Math.abs(newVolume - soundData.lastVolume) > 0.1) {
                console.log(`Bot ${index} volume updated to ${newVolume.toFixed(2)} at distance ${dist2D.toFixed(1)}`);
                soundData.lastVolume = newVolume;
            }
        } else {
            // Only try to play new sounds if not already playing
            playBotSoundIfClose(bot, camera);
        }
        
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
        
        // === UNIQUE PATHS FOR EACH BOT ===
        
        // Direction to player
        const dirToPlayer = new THREE.Vector3();
        dirToPlayer.subVectors(camera.position, bot.position);
        dirToPlayer.y = 0;
        
        const distanceToPlayer = dirToPlayer.length();
        
        if (distanceToPlayer > 1) {
            dirToPlayer.normalize();
            
            // Each bot has unique wandering pattern based on their personality
            const time = Date.now() * 0.002; // Slow oscillation
            
            // Combine multiple factors for unique paths:
            // 1. Sine wave with unique frequency
            const wander1 = Math.sin(time * bot.userData.wanderFreq + bot.userData.sideBias) * bot.userData.wanderAmp;
            
            // 2. Secondary oscillation for more complex patterns
            const wander2 = Math.cos(time * (bot.userData.wanderFreq * 0.5) + bot.userData.sideBias * 2) * (bot.userData.wanderAmp * 0.5);
            
            // 3. Permanent side bias (some bots always drift left/right)
            const bias = bot.userData.sideBias * 0.3;
            
            // Combine wander amounts
            const totalWander = wander1 + wander2 + bias;
            
            // Create perpendicular direction
            const perpDir = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
            
            // Calculate movement direction
            const moveDir = new THREE.Vector3();
            
            // Aggression determines how directly they chase vs wander
            // High aggression = more toward player, low aggression = more wandering
            moveDir.copy(dirToPlayer);
            moveDir.x += perpDir.x * totalWander * (1.5 - bot.userData.aggression);
            moveDir.z += perpDir.z * totalWander * (1.5 - bot.userData.aggression);
            moveDir.normalize();
            
            // Apply speed
            bot.position.x += moveDir.x * currentBotSpeed;
            bot.position.z += moveDir.z * currentBotSpeed;
        }
        
        // Face player
        bot.lookAt(camera.position);
        
        // Insta-kill
        const dist3D = bot.position.distanceTo(camera.position);
        if (dist3D < 4) {
            window.playerHealth = 0;
            document.getElementById('health').textContent = '0';
            if (!isDead) showDeathScreen();
        }
    });
}

function cleanupNextbotSounds() {
    nextbotSoundIntervals.forEach(interval => clearInterval(interval));
    nextbotSoundIntervals = [];
    
    activeSounds.forEach((soundData, bot) => {
        if (soundData.source) {
            try { soundData.source.stop(); } catch (e) {}
        }
        if (bot) bot.userData.isPlayingSound = false;
    });
    activeSounds.clear();
}