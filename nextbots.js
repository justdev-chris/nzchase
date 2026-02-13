// ========== NEXTBOTS.JS - NEXTBOT MANAGER ==========

let nextbotSoundIntervals = [];
let baseBotSpeed = 0.3;

function createAllNextbots(imageURLs, scene, nextbotsArray, botVelocitiesArray) {
    if (!imageURLs || imageURLs.length === 0) return;
    
    const texLoader = new THREE.TextureLoader();
    
    imageURLs.forEach((url, index) => {
        texLoader.load(url, function(texture) {
            const aspect = texture.image.width / texture.image.height;
            const botGeometry = new THREE.PlaneGeometry(6 * aspect, 6);
            const botMaterial = new THREE.MeshLambertMaterial({ 
                map: texture, 
                transparent: true,
                side: THREE.DoubleSide,
                emissive: 0x330000
            });
            
            const bot = new THREE.Mesh(botGeometry, botMaterial);
            
            // Spawn in different positions around the maze
            const angle = (index / imageURLs.length) * Math.PI * 2;
            const radius = 25 + Math.random() * 15;
            bot.position.set(
                Math.cos(angle) * radius,
                4,
                Math.sin(angle) * radius
            );
            
            bot.castShadow = true;
            bot.receiveShadow = true;
            scene.add(bot);
            
            nextbotsArray.push(bot);
            botVelocitiesArray.push(0);
            
        }, undefined, function(error) {
            // Fallback to colored cube if image fails
            const botGeometry = new THREE.BoxGeometry(4, 4, 4);
            const botMaterial = new THREE.MeshLambertMaterial({ 
                color: [0xff3333, 0x33ff33, 0x3333ff, 0xffff33, 0xff33ff][index % 5]
            });
            const bot = new THREE.Mesh(botGeometry, botMaterial);
            
            const angle = (index / imageURLs.length) * Math.PI * 2;
            const radius = 25 + Math.random() * 15;
            bot.position.set(
                Math.cos(angle) * radius,
                2,
                Math.sin(angle) * radius
            );
            
            bot.castShadow = true;
            bot.receiveShadow = true;
            scene.add(bot);
            
            nextbotsArray.push(bot);
            botVelocitiesArray.push(0);
        });
    });
    
    document.getElementById('nextbot-count').textContent = nextbotsArray.length;
}

function setupNextbotSounds() {
    // Clear old intervals
    nextbotSoundIntervals.forEach(interval => clearInterval(interval));
    nextbotSoundIntervals = [];
    
    if (window.nextbotAudio && window.nextbotAudio.length > 0 && window.nextbots) {
        for (let i = 0; i < window.nextbots.length; i++) {
            const interval = setInterval(() => {
                if (!window.isPaused && !window.isDead && window.nextbots[i]) {
                    playNextbotSound(i);
                }
            }, 8000 + Math.random() * 7000);
            nextbotSoundIntervals.push(interval);
        }
    }
}

function playNextbotSound(botIndex) {
    if (window.nextbotAudio && window.nextbotAudio.length > 0 && !window.isMuted && !window.isDead && window.audioContext) {
        const soundIndex = botIndex < window.nextbotAudio.length ? botIndex : Math.floor(Math.random() * window.nextbotAudio.length);
        const sound = window.nextbotAudio[soundIndex];
        if (sound && sound.buffer) {
            const newSound = window.audioContext.createBufferSource();
            newSound.buffer = sound.buffer;
            newSound.connect(window.sfxGain);
            newSound.start();
        }
    }
}

function updateNextbots(camera, playerHealth, isDead, showDeathScreen, baseBotSpeed, botSpeedMultiplier) {
    if (!window.nextbots || !window.botVelocities) return;
    
    const currentBotSpeed = baseBotSpeed * botSpeedMultiplier;
    const gravity = -0.03;
    
    window.nextbots.forEach((bot, index) => {
        if (!bot) return;
        
        // Gravity
        if (window.botVelocities[index] === undefined) window.botVelocities[index] = 0;
        window.botVelocities[index] += gravity;
        bot.position.y += window.botVelocities[index];
        
        if (bot.position.y <= 4) {
            bot.position.y = 4;
            window.botVelocities[index] = 0;
        }
        
        // Move toward player
        const dir = new THREE.Vector3();
        dir.subVectors(camera.position, bot.position).normalize();
        
        let speed = currentBotSpeed;
        const distanceToPlayer = bot.position.distanceTo(camera.position);
        
        if (distanceToPlayer < 20) {
            speed *= 2;
        }
        
        if (Math.random() < 0.02) {
            speed *= 3;
        }
        
        dir.y = 0;
        bot.position.add(dir.multiplyScalar(speed));
        
        const targetLook = camera.position.clone();
        targetLook.y = bot.position.y;
        bot.lookAt(targetLook);
        
        if (Math.random() < 0.01 && bot.position.y <= 4.1) {
            window.botVelocities[index] = 0.6;
        }
        
        // Damage player if too close
        if (distanceToPlayer < 8) {
            playerHealth -= 0.5;
            document.getElementById('health').textContent = Math.max(0, Math.floor(playerHealth));
            
            const shake = (8 - distanceToPlayer) / 4;
            camera.position.x += (Math.random() - 0.5) * shake;
            camera.position.z += (Math.random() - 0.5) * shake;
            
            document.getElementById("hud").style.color = '#ff0000';
            setTimeout(() => {
                document.getElementById("hud").style.color = 'white';
            }, 100);
            
            if (playerHealth <= 0 && !isDead) {
                showDeathScreen();
            }
        }
        
        // Teleport if too far
        if (distanceToPlayer > 80 && Math.random() < 0.005) {
            const angle = Math.random() * Math.PI * 2;
            const teleportDistance = 20 + Math.random() * 30;
            bot.position.set(
                camera.position.x + Math.cos(angle) * teleportDistance,
                4,
                camera.position.z + Math.sin(angle) * teleportDistance
            );
        }
    });
}