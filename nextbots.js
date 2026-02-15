// ========== NEXTBOTS.JS - NEXTBOT MANAGER ==========

let activeSounds = new Map(); // Track active sounds per bot

function createAllNextbots(imageURLs, scene, nextbotsArray, botVelocitiesArray) {
    console.log("Creating nextbots...");
    
    if (!imageURLs || imageURLs.length === 0) {
        console.log("No nextbot images");
        return;
    }
    
    const hasGifSupport = typeof THREE.GifTexture !== 'undefined';
    console.log("GIF support:", hasGifSupport);
    
    // Define different movement PATTERNS for each bot (NO COLORS)
    const movementPatterns = [
        'direct',      // Straight line to player
        'circling',    // Circles around player while approaching
        'zigzag',      // Zigzags left and right
        'flanking',    // Tries to get behind player
        'erratic',     // Random unpredictable movements
        'stalker',     // Moves slowly when close, fast when far
        'charger',     // Charges in straight lines, then pauses
        'spiral',      // Spiral pattern inward
        'bouncing',    // Bounces off walls/other bots
        'patience',    // Waits at distance then rushes
        'jitter',      // Constantly jitters while moving
        'archer',      // Moves in arcs
        'predator',    // Predicts player movement
        'fearful',     // Backs away then charges
        'swarmer'      // Tries to surround player
    ];
    
    imageURLs.forEach((url, index) => {
        const createBotWithTexture = (texture) => {
            if (!texture) {
                createFallbackBot(index, scene, nextbotsArray, botVelocitiesArray);
                return;
            }
            
            // Wait for texture to have image (for GIFs, might be delayed)
            const checkTexture = () => {
                if (!texture.image) {
                    setTimeout(checkTexture, 50);
                    return;
                }
                
                const aspect = texture.image.width / texture.image.height || 1;
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
                
                // Pick a movement pattern
                const patternIndex = index % movementPatterns.length;
                const pattern = movementPatterns[patternIndex];
                
                // Bot personality for COMPLETELY DIFFERENT paths (NO COLORS)
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0,
                    isPlayingSound: false,
                    
                    // Movement pattern
                    pattern: pattern,
                    
                    // UNIQUE BEHAVIOR PARAMETERS (only movement-related)
                    aggression: 0.3 + Math.random() * 0.9, // 0.3-1.2
                    speed: 0.8 + Math.random() * 0.7,      // 0.8-1.5 speed multiplier
                    wanderFreq: 0.2 + Math.random() * 2.5, // 0.2-2.7
                    wanderAmp: 0.1 + Math.random() * 1.2,  // 0.1-1.3
                    sideBias: (Math.random() - 0.5) * 2.0, // -1.0 to 1.0
                    
                    // Pattern-specific properties
                    phase: Math.random() * Math.PI * 2,
                    lastCharge: 0,
                    chargeCooldown: 2000 + Math.random() * 3000,
                    lastDirection: new THREE.Vector3(1, 0, 0),
                    preferredDistance: 5 + Math.random() * 12,
                    hesitation: Math.random() * 0.5,
                    
                    // For tracking
                    lastPlayerPos: new THREE.Vector3(),
                    predictionVector: new THREE.Vector3(),
                    
                    isGif: texture.isGIF || false
                };
                
                bot.castShadow = true;
                bot.receiveShadow = true;
                scene.add(bot);
                
                nextbotsArray.push(bot);
                botVelocitiesArray.push(0);
                console.log(`Bot ${index} spawned with ${pattern} pattern ${bot.userData.isGif ? '(GIF)' : '(static)'}`);
            };
            
            checkTexture();
        };
        
        const createFallbackBot = (idx, scene, botsArray, velocitiesArray) => {
            const patternIndex = idx % movementPatterns.length;
            const pattern = movementPatterns[patternIndex];
            
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
                soundIndex: idx,
                lastSoundTime: 0,
                isPlayingSound: false,
                pattern: pattern,
                aggression: 0.3 + Math.random() * 0.9,
                speed: 0.8 + Math.random() * 0.7,
                wanderFreq: 0.2 + Math.random() * 2.5,
                wanderAmp: 0.1 + Math.random() * 1.2,
                sideBias: (Math.random() - 0.5) * 2.0,
                phase: Math.random() * Math.PI * 2,
                lastCharge: 0,
                chargeCooldown: 2000 + Math.random() * 3000,
                lastDirection: new THREE.Vector3(1, 0, 0),
                preferredDistance: 5 + Math.random() * 12,
                hesitation: Math.random() * 0.5,
                lastPlayerPos: new THREE.Vector3(),
                predictionVector: new THREE.Vector3(),
                isGif: false
            };
            
            scene.add(bot);
            botsArray.push(bot);
            velocitiesArray.push(0);
            console.log(`Bot ${idx} spawned as fallback cube with ${pattern} pattern`);
        };
        
        // Check if it's a GIF
        const fileInput = document.getElementById(`nextbotImage${index + 1}`);
        const isGifFile = fileInput && fileInput.files && fileInput.files[0] && 
                          fileInput.files[0].type === 'image/gif';
        
        const isGifUrl = url.toLowerCase().includes('.gif') || 
                         (typeof THREE.GifTexture !== 'undefined' && 
                         THREE.GifTexture.isGif && 
                         THREE.GifTexture.isGif(url));
        
        const isGif = isGifFile || isGifUrl;
        
        if (isGif && hasGifSupport) {
            console.log(`Loading GIF for bot ${index}:`, url);
            
            const texture = THREE.GifTexture(url, (loadedTexture) => {
                console.log(`GIF ${index} first frame loaded`);
                
                const existingBot = nextbotsArray[index];
                if (existingBot && existingBot.material && existingBot.material.map) {
                    existingBot.material.map = loadedTexture;
                    existingBot.material.needsUpdate = true;
                    
                    if (loadedTexture.image) {
                        const aspect = loadedTexture.image.width / loadedTexture.image.height;
                        const newGeo = new THREE.PlaneGeometry(6 * aspect, 6);
                        existingBot.geometry.dispose();
                        existingBot.geometry = newGeo;
                    }
                }
            });
            
            if (texture) {
                createBotWithTexture(texture);
            } else {
                console.log(`GIF texture creation failed for bot ${index}`);
                createFallbackBot(index, scene, nextbotsArray, botVelocitiesArray);
            }
        } else {
            console.log(`Loading static image for bot ${index}:`, url);
            const texLoader = new THREE.TextureLoader();
            texLoader.load(url, 
                (texture) => {
                    console.log(`Loaded static image for bot ${index}`);
                    createBotWithTexture(texture);
                },
                undefined,
                (error) => {
                    console.log(`Texture failed for bot ${index}, using cube`);
                    createFallbackBot(index, scene, nextbotsArray, botVelocitiesArray);
                }
            );
        }
    });
    
    document.getElementById('nextbot-count').textContent = nextbotsArray.length;
}

function setupNextbotSounds() {
    console.log("Setting up nextbot sounds");
    activeSounds.clear();
}

function calculateVolume(distance) {
    if (distance <= 30) return 1.0;
    if (distance <= 45) return 0.6;
    if (distance <= 60) return 0.6 * (1 - (distance - 45) / 15);
    return 0.0;
}

function playBotSoundIfClose(bot, camera) {
    const soundIndex = bot.userData.soundIndex;
    
    if (bot.userData.isPlayingSound) return;
    
    const dx = camera.position.x - bot.position.x;
    const dz = camera.position.z - bot.position.z;
    const dist2D = Math.sqrt(dx*dx + dz*dz);
    
    const now = Date.now();
    const timeSinceLastSound = now - bot.userData.lastSoundTime;
    
    if (dist2D <= 60 && timeSinceLastSound > 3000) {
        if (soundIndex >= window.nextbotAudio.length || !window.nextbotAudio[soundIndex]) {
            return;
        }
        
        try {
            const soundBuffer = window.nextbotAudio[soundIndex].buffer;
            if (!soundBuffer) return;
            
            const source = audioContext.createBufferSource();
            source.buffer = soundBuffer;
            
            const gainNode = audioContext.createGain();
            
            const volume = calculateVolume(dist2D);
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(sfxGain);
            
            bot.userData.isPlayingSound = true;
            bot.userData.lastSoundTime = now;
            
            activeSounds.set(bot, {
                source: source,
                gainNode: gainNode,
                startTime: now,
                lastVolume: volume
            });
            
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

function updateNextbots(camera, playerHealth, isDead, showDeathScreen, baseBotSpeed, botSpeedMultiplier) {
    if (!window.nextbots || !window.botVelocities) {
        return;
    }
    
    const mapModel = window.currentMapModel || currentMapModel;
    if (!mapModel) return;
    
    const globalSpeed = baseBotSpeed * botSpeedMultiplier;
    const gravity = -0.03;
    const now = Date.now();
    
    window.nextbots.forEach((bot, index) => {
        if (!bot) return;
        
        // Update sound volumes
        if (activeSounds.has(bot)) {
            const soundData = activeSounds.get(bot);
            const dx = camera.position.x - bot.position.x;
            const dz = camera.position.z - bot.position.z;
            const dist2D = Math.sqrt(dx*dx + dz*dz);
            
            const newVolume = calculateVolume(dist2D);
            soundData.gainNode.gain.value = newVolume;
            soundData.lastVolume = newVolume;
        } else {
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
        
        // ========== COMPLETELY DIFFERENT PATHFINDING PATTERNS ==========
        
        // Direction to player
        const dirToPlayer = new THREE.Vector3();
        dirToPlayer.subVectors(camera.position, bot.position);
        dirToPlayer.y = 0;
        
        const distanceToPlayer = dirToPlayer.length();
        
        if (distanceToPlayer > 1) {
            dirToPlayer.normalize();
            
            // Get bot's unique pattern
            const pattern = bot.userData.pattern;
            const speed = globalSpeed * (bot.userData.speed || 1.0);
            
            // Initialize move direction
            let moveDir = new THREE.Vector3();
            
            // ===== DIFFERENT PATHFINDING FOR EACH PATTERN =====
            
            if (pattern === 'direct') {
                // Simplest - straight line to player
                moveDir.copy(dirToPlayer);
                
            } else if (pattern === 'circling') {
                // Circles around player while slowly closing in
                const circleRadius = 8 + Math.sin(now * 0.001) * 3;
                const circleSpeed = 0.02;
                const angle = now * circleSpeed + bot.userData.phase;
                
                const circlePos = new THREE.Vector3(
                    camera.position.x + Math.cos(angle) * circleRadius,
                    0,
                    camera.position.z + Math.sin(angle) * circleRadius
                );
                
                moveDir.subVectors(circlePos, bot.position);
                moveDir.y = 0;
                moveDir.normalize();
                
            } else if (pattern === 'zigzag') {
                // Zigzags left and right
                const perpDir = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
                const zigzag = Math.sin(now * 0.005 + bot.userData.phase) * 1.5;
                
                moveDir.copy(dirToPlayer);
                moveDir.x += perpDir.x * zigzag;
                moveDir.z += perpDir.z * zigzag;
                
            } else if (pattern === 'flanking') {
                // Tries to get behind player
                const behindPlayer = new THREE.Vector3(
                    camera.position.x - dirToPlayer.x * 5,
                    0,
                    camera.position.z - dirToPlayer.z * 5
                );
                
                moveDir.subVectors(behindPlayer, bot.position);
                moveDir.y = 0;
                moveDir.normalize();
                
                // Blend with direct approach
                moveDir.lerp(dirToPlayer, 0.3);
                
            } else if (pattern === 'erratic') {
                // Random unpredictable movements
                const randomAngle = Math.sin(now * 0.01 + bot.userData.phase) * 
                                   Math.cos(now * 0.007) * 2;
                
                const perpDir = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
                
                moveDir.copy(dirToPlayer);
                moveDir.x += perpDir.x * randomAngle;
                moveDir.z += perpDir.z * randomAngle;
                
            } else if (pattern === 'stalker') {
                // Moves slowly when close, fast when far
                if (distanceToPlayer < 8) {
                    moveDir.copy(dirToPlayer).multiplyScalar(0.3);
                } else if (distanceToPlayer > 20) {
                    moveDir.copy(dirToPlayer).multiplyScalar(1.8);
                } else {
                    moveDir.copy(dirToPlayer);
                }
                
            } else if (pattern === 'charger') {
                // Charges in straight lines, then pauses
                if (!bot.userData.lastCharge) bot.userData.lastCharge = now;
                
                if (now - bot.userData.lastCharge > bot.userData.chargeCooldown) {
                    // CHARGE!
                    bot.userData.lastCharge = now;
                    bot.userData.chargeCooldown = 2000 + Math.random() * 3000;
                    
                    // Store charge direction
                    bot.userData.lastDirection.copy(dirToPlayer);
                    moveDir.copy(dirToPlayer).multiplyScalar(3.0);
                } else if (now - bot.userData.lastCharge < 500) {
                    // Still charging
                    moveDir.copy(bot.userData.lastDirection).multiplyScalar(2.0);
                } else {
                    // Recovering/hesitating
                    moveDir.copy(dirToPlayer).multiplyScalar(0.2);
                }
                
            } else if (pattern === 'spiral') {
                // Spiral pattern inward
                const spiralRadius = distanceToPlayer * 0.5;
                const angle = now * 0.003 + bot.userData.phase;
                
                const spiralOffset = new THREE.Vector3(
                    Math.cos(angle) * spiralRadius,
                    0,
                    Math.sin(angle) * spiralRadius
                );
                
                const targetPos = new THREE.Vector3().copy(camera.position).add(spiralOffset);
                moveDir.subVectors(targetPos, bot.position);
                moveDir.y = 0;
                
            } else if (pattern === 'bouncing') {
                // Bounces off other bots (handled in repulsion)
                moveDir.copy(dirToPlayer);
                
            } else if (pattern === 'patience') {
                // Waits at distance then rushes
                if (distanceToPlayer > 15) {
                    moveDir.copy(dirToPlayer).multiplyScalar(0.1);
                } else {
                    moveDir.copy(dirToPlayer).multiplyScalar(2.0);
                }
                
            } else if (pattern === 'jitter') {
                // Constantly jitters while moving
                const jitterX = (Math.random() - 0.5) * 2;
                const jitterZ = (Math.random() - 0.5) * 2;
                
                moveDir.copy(dirToPlayer);
                moveDir.x += jitterX;
                moveDir.z += jitterZ;
                
            } else if (pattern === 'archer') {
                // Moves in arcs
                const arcAngle = Math.sin(now * 0.002 + bot.userData.phase) * Math.PI/3;
                const rotatedDir = new THREE.Vector3(
                    dirToPlayer.x * Math.cos(arcAngle) - dirToPlayer.z * Math.sin(arcAngle),
                    0,
                    dirToPlayer.x * Math.sin(arcAngle) + dirToPlayer.z * Math.cos(arcAngle)
                );
                
                moveDir.copy(rotatedDir);
                
            } else if (pattern === 'predator') {
                // Predicts player movement
                const playerVel = new THREE.Vector3().subVectors(camera.position, bot.userData.lastPlayerPos);
                bot.userData.lastPlayerPos.copy(camera.position);
                
                const predictedPos = new THREE.Vector3().copy(camera.position).add(playerVel.multiplyScalar(2));
                
                moveDir.subVectors(predictedPos, bot.position);
                moveDir.y = 0;
                
            } else if (pattern === 'fearful') {
                // Backs away then charges
                if (distanceToPlayer < 8) {
                    // Back away
                    moveDir.copy(dirToPlayer).multiplyScalar(-1.5);
                } else if (distanceToPlayer > 20) {
                    // Charge
                    moveDir.copy(dirToPlayer).multiplyScalar(2.0);
                } else {
                    moveDir.copy(dirToPlayer);
                }
                
            } else if (pattern === 'swarmer') {
                // Tries to surround player - finds empty spots
                const angleToPlayer = Math.atan2(dirToPlayer.z, dirToPlayer.x);
                const targetAngle = angleToPlayer + (index * 0.8); // Spread out
                
                const surroundPos = new THREE.Vector3(
                    camera.position.x + Math.cos(targetAngle) * 7,
                    0,
                    camera.position.z + Math.sin(targetAngle) * 7
                );
                
                moveDir.subVectors(surroundPos, bot.position);
                moveDir.y = 0;
                
            } else {
                // Default fallback
                moveDir.copy(dirToPlayer);
            }
            
            // Normalize move direction
            if (moveDir.length() > 0.1) {
                moveDir.normalize();
            }
            
            // === BOT REPULSION - KEEP THEM APART ===
            const repulsionRadius = 10;
            const repulsionStrength = 0.8;
            
            let repulsionX = 0;
            let repulsionZ = 0;
            
            window.nextbots.forEach((otherBot, otherIndex) => {
                if (otherIndex === index || !otherBot) return;
                
                const dx = bot.position.x - otherBot.position.x;
                const dz = bot.position.z - otherBot.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist < repulsionRadius) {
                    const force = Math.pow(1 - dist/repulsionRadius, 2) * repulsionStrength;
                    if (dist > 0.1) {
                        repulsionX += (dx / dist) * force;
                        repulsionZ += (dz / dist) * force;
                    } else {
                        const randomAngle = Math.random() * Math.PI * 2;
                        repulsionX += Math.cos(randomAngle) * repulsionStrength;
                        repulsionZ += Math.sin(randomAngle) * repulsionStrength;
                    }
                }
            });
            
            // Apply repulsion
            if (repulsionX !== 0 || repulsionZ !== 0) {
                moveDir.x += repulsionX * 2;
                moveDir.z += repulsionZ * 2;
                moveDir.normalize();
            }
            
            // Apply speed
            bot.position.x += moveDir.x * speed;
            bot.position.z += moveDir.z * speed;
        }
        
        // Always look at player
        bot.lookAt(camera.position);
        
        // Insta-kill
        const dist3D = bot.position.distanceTo(camera.position);
        if (dist3D < 3) {
            window.playerHealth = 0;
            document.getElementById('health').textContent = '0';
            if (!isDead) showDeathScreen();
        }
    });
}

function cleanupNextbotSounds() {
    activeSounds.forEach((soundData, bot) => {
        if (soundData.source) {
            try { soundData.source.stop(); } catch (e) {}
        }
        if (bot) bot.userData.isPlayingSound = false;
    });
    activeSounds.clear();
}
