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
                
                // Bot personality for varied paths
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0,
                    isPlayingSound: false,
                    aggression: 0.5 + Math.random() * 0.8,
                    wanderFreq: 0.5 + Math.random() * 2.0,
                    wanderAmp: 0.2 + Math.random() * 0.8,
                    sideBias: (Math.random() - 0.5) * 1.5,
                    isGif: texture.isGIF || false
                };
                
                bot.castShadow = true;
                bot.receiveShadow = true;
                scene.add(bot);
                
                nextbotsArray.push(bot);
                botVelocitiesArray.push(0);
                console.log(`Bot ${index} spawned ${bot.userData.isGif ? '(GIF)' : '(static)'}`);
            };
            
            checkTexture();
        };
        
        const createFallbackBot = (idx, scene, botsArray, velocitiesArray) => {
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
                aggression: 0.5 + Math.random() * 0.8,
                wanderFreq: 0.5 + Math.random() * 2.0,
                wanderAmp: 0.2 + Math.random() * 0.8,
                sideBias: (Math.random() - 0.5) * 1.5,
                isGif: false
            };
            
            scene.add(bot);
            botsArray.push(bot);
            velocitiesArray.push(0);
            console.log(`Bot ${idx} spawned as fallback cube`);
        };
        
        // Check if it's a GIF
        const isGif = url.toLowerCase().includes('.gif') || 
                      (typeof THREE.GifTexture !== 'undefined' && 
                      THREE.GifTexture.isGif && 
                      THREE.GifTexture.isGif(url));
        
        if (isGif && hasGifSupport) {
            // Load as GIF - FIXED
            console.log(`Loading GIF for bot ${index}:`, url);
            
            // THREE.GifTexture returns texture immediately
            const texture = THREE.GifTexture(url, (loadedTexture) => {
                // Optional callback when first frame loads
                console.log(`GIF ${index} first frame loaded`);
                
                // Update any bots that might be waiting
                const existingBot = nextbotsArray[index];
                if (existingBot && existingBot.material && existingBot.material.map) {
                    existingBot.material.map = loadedTexture;
                    existingBot.material.needsUpdate = true;
                    
                    // Update geometry aspect ratio if needed
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
            // Load as regular texture
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
    
    // Don't play if this bot is already playing a sound
    if (bot.userData.isPlayingSound) return;
    
    // Calculate 2D distance
    const dx = camera.position.x - bot.position.x;
    const dz = camera.position.z - bot.position.z;
    const dist2D = Math.sqrt(dx*dx + dz*dz);
    
    // Check if within range and not spamming
    const now = Date.now();
    const timeSinceLastSound = now - bot.userData.lastSoundTime;
    
    if (dist2D <= 60 && timeSinceLastSound > 3000) {
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
            soundData.lastVolume = newVolume;
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
        
        // === MOVEMENT WITH BOT REPULSION ===
        
        // Direction to player
        const dirToPlayer = new THREE.Vector3();
        dirToPlayer.subVectors(camera.position, bot.position);
        dirToPlayer.y = 0;
        
        const distanceToPlayer = dirToPlayer.length();
        
        if (distanceToPlayer > 1) {
            dirToPlayer.normalize();
            
            // Calculate wander
            const time = Date.now() * 0.002;
            const wander1 = Math.sin(time * bot.userData.wanderFreq + bot.userData.sideBias) * bot.userData.wanderAmp;
            const wander2 = Math.cos(time * (bot.userData.wanderFreq * 0.5) + bot.userData.sideBias * 2) * (bot.userData.wanderAmp * 0.5);
            const bias = bot.userData.sideBias * 0.3;
            const totalWander = wander1 + wander2 + bias;
            
            const perpDir = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
            
            // Base movement toward player with wander
            const moveDir = new THREE.Vector3();
            moveDir.copy(dirToPlayer);
            moveDir.x += perpDir.x * totalWander * (1.5 - bot.userData.aggression);
            moveDir.z += perpDir.z * totalWander * (1.5 - bot.userData.aggression);
            
            // === BOT REPULSION - KEEP THEM APART ===
            const repulsionRadius = 10;
            const repulsionStrength = 0.8;
            
            let repulsionX = 0;
            let repulsionZ = 0;
            let repulsionCount = 0;
            
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
                    repulsionCount++;
                }
            });
            
            if (repulsionCount > 0) {
                moveDir.x += repulsionX * 2;
                moveDir.z += repulsionZ * 2;
            }
            
            // Spread around player when close
            if (distanceToPlayer < 5) {
                const angleToPlayer = Math.atan2(dirToPlayer.z, dirToPlayer.x);
                const spreadAngle = angleToPlayer + (index * 1.5);
                moveDir.x += Math.cos(spreadAngle) * 0.5;
                moveDir.z += Math.sin(spreadAngle) * 0.5;
            }
            
            moveDir.normalize();
            
            // Apply speed
            bot.position.x += moveDir.x * currentBotSpeed;
            bot.position.z += moveDir.z * currentBotSpeed;
        }
        
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
    activeSounds.forEach((soundData, bot) => {
        if (soundData.source) {
            try { soundData.source.stop(); } catch (e) {}
        }
        if (bot) bot.userData.isPlayingSound = false;
    });
    activeSounds.clear();
}
