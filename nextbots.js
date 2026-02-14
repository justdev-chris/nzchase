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
                
                // Add personality for varied paths (without changing speed)
                bot.userData = {
                    soundIndex: index,
                    lastSoundTime: 0,
                    wanderOffset: Math.random() * Math.PI * 2, // Random starting angle
                    wanderStrength: 0.2 + Math.random() * 0.3, // How much they wander 0.2-0.5
                    sidePreference: (Math.random() - 0.5) * 0.5 // Tendency to go left/right
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
                    lastSoundTime: 0,
                    wanderOffset: Math.random() * Math.PI * 2,
                    wanderStrength: 0.2 + Math.random() * 0.3,
                    sidePreference: (Math.random() - 0.5) * 0.5
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
    // Just initialize - actual sound checking happens in updateNextbots
}

function playBotSoundIfClose(bot, camera) {
    const soundIndex = bot.userData.soundIndex;
    
    // Calculate 2D distance (X and Z only)
    const dx = camera.position.x - bot.position.x;
    const dz = camera.position.z - bot.position.z;
    const dist2D = Math.sqrt(dx*dx + dz*dz);
    
    // Check if within range and not spamming
    const now = Date.now();
    const timeSinceLastSound = now - bot.userData.lastSoundTime;
    
    // Only play if within 20 units and cooldown passed
    if (dist2D <= 20 && timeSinceLastSound > 3000) {
        if (soundIndex >= window.nextbotAudio.length || !window.nextbotAudio[soundIndex]) {
            return;
        }
        
        try {
            const soundBuffer = window.nextbotAudio[soundIndex].buffer;
            if (!soundBuffer) return;
            
            // Calculate volume based on 2D distance
            let volume = 0;
            if (dist2D <= 10) {
                volume = 1.0;
            } else if (dist2D <= 16) {
                volume = 0.6;
            } else if (dist2D <= 20) {
                volume = 0.6 * (1 - (dist2D - 16) / 4);
            } else {
                return;
            }
            
            console.log(`Bot ${soundIndex} playing at ${dist2D.toFixed(1)} units, volume ${volume.toFixed(2)}`);
            
            const source = audioContext.createBufferSource();
            source.buffer = soundBuffer;
            
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(sfxGain);
            
            source.onended = () => {
                activeSounds = activeSounds.filter(s => s.source !== source);
            };
            
            source.start();
            
            activeSounds.push({
                source: source,
                gainNode: gainNode,
                bot: bot
            });
            
            bot.userData.lastSoundTime = now;
            
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    }
}

function updateNextbots(camera, playerHealth, isDead, showDeathScreen, baseBotSpeed, botSpeedMultiplier) {
    if (!window.nextbots || !window.botVelocities) {
        return;
    }
    
    const mapModel = window.currentMapModel || currentMapModel;
    if (!mapModel) return;
    
    // Use the existing speed slider value
    const currentBotSpeed = baseBotSpeed * botSpeedMultiplier;
    const gravity = -0.03;
    
    window.nextbots.forEach((bot, index) => {
        if (!bot) return;
        
        // Check sound every frame
        playBotSoundIfClose(bot, camera);
        
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
        
        // === VARIED PATHS WITHOUT CHANGING SPEED ===
        
        // Direction to player
        const dirToPlayer = new THREE.Vector3();
        dirToPlayer.subVectors(camera.position, bot.position);
        dirToPlayer.y = 0;
        dirToPlayer.normalize();
        
        // Add wandering based on bot's personality
        // This creates a sine wave movement side-to-side while still moving forward
        const time = Date.now() * 0.002;
        const wanderAmount = Math.sin(time + bot.userData.wanderOffset) * bot.userData.wanderStrength;
        
        // Create perpendicular direction (left/right)
        const perpDir = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
        
        // Combine: mostly toward player, slightly wandering side to side
        const moveDir = new THREE.Vector3();
        moveDir.copy(dirToPlayer);
        moveDir.x += perpDir.x * wanderAmount;
        moveDir.z += perpDir.z * wanderAmount;
        moveDir.normalize();
        
        // Apply movement with original speed (no modification)
        bot.position.x += moveDir.x * currentBotSpeed;
        bot.position.z += moveDir.z * currentBotSpeed;
        
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
    
    activeSounds.forEach(sound => {
        if (sound.source) {
            try { sound.source.stop(); } catch (e) {}
        }
    });
    activeSounds = [];
}