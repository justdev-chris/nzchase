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
                
                // Create ACTUAL different paths by giving each bot unique:
                // 1. Waypoint system (they navigate through different points)
                // 2. Preferred approach angles
                // 3. Obstacle avoidance priorities
                // 4. Flanking behaviors
                
                const pathType = Math.floor(Math.random() * 5); // 0-4
                
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0,
                    isPlayingSound: false,
                    
                    // PATH TYPE - completely different routes
                    pathType: pathType,
                    
                    // PATHFINDING PARAMETERS
                    // Type 0: Direct - straight line (aggressive)
                    // Type 1: Left flank - always approaches from left side
                    // Type 2: Right flank - always approaches from right side
                    // Type 3: Wide loops - takes long弧形 paths
                    // Type 4: Stalker - hides behind obstacles
                    
                    // For left/right flanking
                    flankDirection: pathType === 1 ? -1 : (pathType === 2 ? 1 : 0),
                    
                    // For waypoint navigation
                    waypoints: generateWaypoints(pathType, bot.position.clone(), radius),
                    currentWaypoint: 0,
                    
                    // For wide loops
                    loopRadius: 15 + Math.random() * 20,
                    loopAngle: Math.random() * Math.PI * 2,
                    loopSpeed: 0.002 + Math.random() * 0.003,
                    
                    // For stalking
                    hidingSpot: null,
                    lastSeenPlayer: null,
                    
                    // General
                    aggression: 0.5 + Math.random() * 0.8,
                    speed: 0.8 + Math.random() * 0.4,
                    
                    isGif: texture.isGIF || false
                };
                
                bot.castShadow = true;
                bot.receiveShadow = true;
                scene.add(bot);
                
                nextbotsArray.push(bot);
                botVelocitiesArray.push(0);
                console.log(`Bot ${index} spawned with PATH TYPE ${pathType} ${bot.userData.isGif ? '(GIF)' : '(static)'}`);
            };
            
            checkTexture();
        };
        
        const createFallbackBot = (idx, scene, botsArray, velocitiesArray) => {
            const pathType = Math.floor(Math.random() * 5);
            
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
                pathType: pathType,
                flankDirection: pathType === 1 ? -1 : (pathType === 2 ? 1 : 0),
                waypoints: generateWaypoints(pathType, bot.position.clone(), radius),
                currentWaypoint: 0,
                loopRadius: 15 + Math.random() * 20,
                loopAngle: Math.random() * Math.PI * 2,
                loopSpeed: 0.002 + Math.random() * 0.003,
                hidingSpot: null,
                lastSeenPlayer: null,
                aggression: 0.5 + Math.random() * 0.8,
                speed: 0.8 + Math.random() * 0.4,
                isGif: false
            };
            
            scene.add(bot);
            botsArray.push(bot);
            velocitiesArray.push(0);
            console.log(`Bot ${idx} spawned as fallback cube with PATH TYPE ${pathType}`);
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

// Generate different waypoint paths for each bot type
function generateWaypoints(pathType, startPos, spawnRadius) {
    const waypoints = [];
    const center = new THREE.Vector3(0, 0, 0);
    
    switch(pathType) {
        case 0: // Direct - just go straight to player (no waypoints)
            return [];
            
        case 1: // Left flank - waypoints on left side
            for (let i = 0; i < 3; i++) {
                const angle = -Math.PI/4 + (i * Math.PI/4);
                waypoints.push(new THREE.Vector3(
                    Math.cos(angle) * (spawnRadius - i * 5),
                    0,
                    Math.sin(angle) * (spawnRadius - i * 5)
                ));
            }
            break;
            
        case 2: // Right flank - waypoints on right side
            for (let i = 0; i < 3; i++) {
                const angle = Math.PI/4 - (i * Math.PI/4);
                waypoints.push(new THREE.Vector3(
                    Math.cos(angle) * (spawnRadius - i * 5),
                    0,
                    Math.sin(angle) * (spawnRadius - i * 5)
                ));
            }
            break;
            
        case 3: // Wide loops - circular path
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                waypoints.push(new THREE.Vector3(
                    Math.cos(angle) * spawnRadius * 1.5,
                    0,
                    Math.sin(angle) * spawnRadius * 1.5
                ));
            }
            break;
            
        case 4: // Stalker - hide behind points
            waypoints.push(new THREE.Vector3(-10, 0, -10));
            waypoints.push(new THREE.Vector3(10, 0, -10));
            waypoints.push(new THREE.Vector3(-10, 0, 10));
            waypoints.push(new THREE.Vector3(10, 0, 10));
            break;
    }
    
    return waypoints;
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
        
        // ========== ACTUAL DIFFERENT PATHS ==========
        
        // Get bot data
        const pathType = bot.userData.pathType;
        const speed = globalSpeed * bot.userData.speed;
        
        // Direction to player (for reference)
        const dirToPlayer = new THREE.Vector3();
        dirToPlayer.subVectors(camera.position, bot.position);
        dirToPlayer.y = 0;
        const distanceToPlayer = dirToPlayer.length();
        
        let targetPosition = null;
        
        // PATH TYPE 0: DIRECT - Straight line to player
        if (pathType === 0) {
            targetPosition = camera.position.clone();
        }
        
        // PATH TYPE 1: LEFT FLANK - Always approach from left
        else if (pathType === 1) {
            const leftOffset = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).normalize().multiplyScalar(8);
            targetPosition = camera.position.clone().add(leftOffset);
        }
        
        // PATH TYPE 2: RIGHT FLANK - Always approach from right
        else if (pathType === 2) {
            const rightOffset = new THREE.Vector3(dirToPlayer.z, 0, -dirToPlayer.x).normalize().multiplyScalar(8);
            targetPosition = camera.position.clone().add(rightOffset);
        }
        
        // PATH TYPE 3: WIDE LOOPS - Circular path around player
        else if (pathType === 3) {
            bot.userData.loopAngle += bot.userData.loopSpeed;
            const loopRadius = bot.userData.loopRadius * (0.8 + Math.sin(now * 0.001) * 0.2);
            
            targetPosition = new THREE.Vector3(
                camera.position.x + Math.cos(bot.userData.loopAngle) * loopRadius,
                0,
                camera.position.z + Math.sin(bot.userData.loopAngle) * loopRadius
            );
        }
        
        // PATH TYPE 4: STALKER - Use waypoints, move when player not looking
        else if (pathType === 4) {
            // Check if player is looking at bot
            const lookDir = new THREE.Vector3();
            camera.getWorldDirection(lookDir);
            const toBot = new THREE.Vector3().subVectors(bot.position, camera.position).normalize();
            const dot = lookDir.dot(toBot);
            
            // If player looking away, move closer
            if (dot < 0.3) {
                targetPosition = camera.position.clone();
            } else {
                // Hide behind waypoint
                if (bot.userData.waypoints && bot.userData.waypoints.length > 0) {
                    targetPosition = bot.userData.waypoints[bot.userData.currentWaypoint];
                    
                    // Move to next waypoint occasionally
                    if (Math.random() < 0.01) {
                        bot.userData.currentWaypoint = (bot.userData.currentWaypoint + 1) % bot.userData.waypoints.length;
                    }
                } else {
                    targetPosition = camera.position.clone();
                }
            }
        }
        
        // Move towards target
        if (targetPosition) {
            const moveDir = new THREE.Vector3().subVectors(targetPosition, bot.position);
            moveDir.y = 0;
            
            if (moveDir.length() > 0.1) {
                moveDir.normalize();
                
                // Add some randomness based on path type
                if (pathType === 0) {
                    // Direct - minimal randomness
                } else if (pathType === 1 || pathType === 2) {
                    // Flankers - add slight perpendicular movement
                    const perp = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
                    moveDir.add(perp.multiplyScalar(Math.sin(now * 0.005) * 0.3));
                    moveDir.normalize();
                } else if (pathType === 3) {
                    // Loopers - already on circular path
                } else if (pathType === 4) {
                    // Stalkers - stop when being watched
                    const lookDir = new THREE.Vector3();
                    camera.getWorldDirection(lookDir);
                    const toBot = new THREE.Vector3().subVectors(bot.position, camera.position).normalize();
                    const dot = lookDir.dot(toBot);
                    
                    if (dot > 0.5) {
                        // Player looking - freeze!
                        moveDir.multiplyScalar(0);
                    }
                }
                
                // Apply movement
                bot.position.x += moveDir.x * speed;
                bot.position.z += moveDir.z * speed;
            }
        }
        
        // === BOT REPULSION - Keep them from stacking ===
        const repulsionRadius = 8;
        const repulsionStrength = 0.6;
        
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
                }
            }
        });
        
        // Apply repulsion
        if (repulsionX !== 0 || repulsionZ !== 0) {
            bot.position.x += repulsionX;
            bot.position.z += repulsionZ;
        }
        
        // Always look at player
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
