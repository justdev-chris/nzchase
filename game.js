// ========== GAME STATE ==========
let scene, camera, renderer;
let bot;
let playerVelocityY = 0;
let botVelocityY = 0;
const gravity = -0.03;
const floorY = 2.0;
let isOnGround = true;
let playerHealth = 100;

// SPEED VARIABLES
let basePlayerSpeed = 0.35;
let maxSpeed = 0.35;
let acceleration = 0.15;
let friction = 0.9;

let baseBotSpeed = 0.3;
let mouseSensitivity = 0.002;
let yaw = 0;
let distanceTraveled = 0;
let gameTime = 0;
let lastPosition = new THREE.Vector3();
let velocity = new THREE.Vector3();
let isMouseLocked = false;
let isPaused = false;
let isDead = false;

// ========== SLIDER VALUES ==========
let playerSpeedMultiplier = 1;
let jumpHeightMultiplier = 1;
let botSpeedMultiplier = 1;
let mapScale = 10.0; // Increased default to 10x

// ========== AUDIO SYSTEM ==========
let audioContext;
let bgMusic, nextbotAudio = [];
let masterGain, musicGain, sfxGain;
let isMuted = false;
let nextbotSoundInterval;

// ========== FILE STORAGE ==========
let savedNextbotImage = null;
let savedBgMusic = null;
let savedNextbotSounds = [];
let saved3DMap = null;
let autoFloorEnabled = true;

// ========== COLLISION SYSTEM ==========
let currentMapModel = null;
let mapColliders = [];
let mapBounds = null;

// ========== UI ELEMENT GETTERS ==========
function getElement(id) {
    return document.getElementById(id);
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    if (typeof THREE === 'undefined') {
        alert("Three.js failed to load! Please refresh the page.");
        return;
    }
    
    loadSavedSettings();
    setupEventListeners();
    setupAudioContext();
    updatePlayButton();
});

function loadSavedSettings() {
    const savedSettings = localStorage.getItem('nzchase_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            
            if (settings.playerSpeed !== undefined) {
                getElement('playerSpeed').value = settings.playerSpeed;
                playerSpeedMultiplier = settings.playerSpeed / 100;
                getElement('playerSpeedValue').textContent = settings.playerSpeed + '%';
            }
            
            if (settings.jumpHeight !== undefined) {
                getElement('jumpHeight').value = settings.jumpHeight;
                jumpHeightMultiplier = settings.jumpHeight / 100;
                getElement('jumpHeightValue').textContent = settings.jumpHeight + '%';
            }
            
            if (settings.botSpeed !== undefined) {
                getElement('botSpeed').value = settings.botSpeed;
                botSpeedMultiplier = settings.botSpeed / 100;
                getElement('botSpeedValue').textContent = settings.botSpeed + '%';
            }
            
            if (settings.masterVolume !== undefined) {
                getElement('masterVolume').value = settings.masterVolume;
                getElement('volumeDisplay').textContent = settings.masterVolume + '%';
            }
            
            if (settings.mapScale !== undefined) {
                getElement('mapScale').value = settings.mapScale;
                mapScale = parseFloat(settings.mapScale);
                getElement('mapScaleValue').textContent = settings.mapScale + 'x';
            }
            
            if (settings.autoFloor !== undefined) {
                getElement('autoFloor').checked = settings.autoFloor;
                autoFloorEnabled = settings.autoFloor;
            }
            
            if (settings.nextbotImageName) {
                getElement('lastNextbotName').textContent = settings.nextbotImageName;
                getElement('lastNextbotPreview').style.display = 'block';
            }
            
            if (settings.bgMusicName) {
                getElement('lastBgMusicName').textContent = settings.bgMusicName;
                getElement('lastBgMusicPreview').style.display = 'block';
            }
            
            if (settings.nextbotSoundsCount) {
                getElement('lastSoundsCount').textContent = settings.nextbotSoundsCount;
                getElement('lastSoundsPreview').style.display = 'block';
            }
            
            if (settings.map3dName) {
                getElement('lastMapName').textContent = settings.map3dName;
                getElement('lastMapPreview').style.display = 'block';
            }
            
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
    }
}

function saveSettings() {
    if (!getElement('rememberSettings').checked) return;
    
    const settings = {
        playerSpeed: getElement('playerSpeed').value,
        jumpHeight: getElement('jumpHeight').value,
        botSpeed: getElement('botSpeed').value,
        masterVolume: getElement('masterVolume').value,
        mapScale: getElement('mapScale').value,
        autoFloor: getElement('autoFloor').checked,
        nextbotImageName: savedNextbotImage ? savedNextbotImage.name : null,
        bgMusicName: savedBgMusic ? savedBgMusic.name : null,
        nextbotSoundsCount: savedNextbotSounds.length,
        map3dName: saved3DMap ? saved3DMap.name : null
    };
    
    localStorage.setItem('nzchase_settings', JSON.stringify(settings));
}

function clearSavedSettings() {
    localStorage.removeItem('nzchase_settings');
    savedNextbotImage = null;
    savedBgMusic = null;
    savedNextbotSounds = [];
    saved3DMap = null;
    
    getElement('lastNextbotPreview').style.display = 'none';
    getElement('lastBgMusicPreview').style.display = 'none';
    getElement('lastSoundsPreview').style.display = 'none';
    getElement('lastMapPreview').style.display = 'none';
    
    getElement('playerSpeed').value = 100;
    getElement('jumpHeight').value = 100;
    getElement('botSpeed').value = 100;
    getElement('masterVolume').value = 50;
    getElement('mapScale').value = 10.0; // Updated default
    getElement('autoFloor').checked = true;
    
    playerSpeedMultiplier = 1;
    jumpHeightMultiplier = 1;
    botSpeedMultiplier = 1;
    mapScale = 10.0; // Updated default
    autoFloorEnabled = true;
    
    getElement('playerSpeedValue').textContent = '100%';
    getElement('jumpHeightValue').textContent = '100%';
    getElement('botSpeedValue').textContent = '100%';
    getElement('volumeDisplay').textContent = '50%';
    getElement('mapScaleValue').textContent = '10.0x'; // Updated display
    
    alert("Settings cleared!");
}

function setupEventListeners() {
    getElement('nextbotImage').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            savedNextbotImage = e.target.files[0];
        }
        updatePlayButton();
    });
    
    getElement('bgMusic').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            savedBgMusic = e.target.files[0];
        }
    });
    
    getElement('nextbotSounds').addEventListener('change', (e) => {
        savedNextbotSounds = Array.from(e.target.files);
    });
    
    getElement('map3d').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            saved3DMap = e.target.files[0];
        }
    });
    
    // Map scale slider now goes up to 20x
    getElement('mapScale').addEventListener('input', (e) => {
        mapScale = parseFloat(e.target.value);
        getElement('mapScaleValue').textContent = e.target.value + 'x';
        saveSettings();
    });
    
    getElement('autoFloor').addEventListener('change', (e) => {
        autoFloorEnabled = e.target.checked;
        saveSettings();
    });
    
    getElement('playerSpeed').addEventListener('input', (e) => {
        playerSpeedMultiplier = e.target.value / 100;
        getElement('playerSpeedValue').textContent = e.target.value + '%';
        saveSettings();
    });
    
    getElement('jumpHeight').addEventListener('input', (e) => {
        jumpHeightMultiplier = e.target.value / 100;
        getElement('jumpHeightValue').textContent = e.target.value + '%';
        saveSettings();
    });
    
    getElement('botSpeed').addEventListener('input', (e) => {
        botSpeedMultiplier = e.target.value / 100;
        getElement('botSpeedValue').textContent = e.target.value + '%';
        saveSettings();
    });
    
    getElement('masterVolume').addEventListener('input', (e) => {
        const vol = e.target.value / 100;
        getElement('volumeDisplay').textContent = e.target.value + '%';
        if (masterGain) masterGain.gain.value = vol;
        saveSettings();
    });
    
    getElement('clearMemoryBtn').addEventListener('click', clearSavedSettings);
    getElement('playBtn').addEventListener('click', startGame);
    getElement('resumeBtn').addEventListener('click', resumeGame);
    getElement('pauseQuitBtn').addEventListener('click', returnToMenu);
    getElement('menuBtn').addEventListener('click', returnToMenu);
    
    getElement('muteBtn').addEventListener('click', toggleMute);
    getElement('musicVolume').addEventListener('input', (e) => {
        if (musicGain) musicGain.gain.value = e.target.value / 100;
    });
    getElement('sfxVolume').addEventListener('input', (e) => {
        if (sfxGain) sfxGain.gain.value = e.target.value / 100;
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && isMouseLocked && !isDead) {
            togglePause();
        }
    });
}

function updatePlayButton() {
    getElement('playBtn').disabled = !getElement('nextbotImage').files[0];
}

function setupAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        musicGain = audioContext.createGain();
        sfxGain = audioContext.createGain();
        
        masterGain.connect(audioContext.destination);
        musicGain.connect(masterGain);
        sfxGain.connect(masterGain);
        
        masterGain.gain.value = getElement('masterVolume').value / 100;
        musicGain.gain.value = 0.7;
        sfxGain.gain.value = 0.8;
    } catch (e) {
        console.log("Audio not supported");
    }
}

async function startGame() {
    getElement('loading').style.display = 'block';
    
    try {
        saveSettings();
        
        const nextbotURL = URL.createObjectURL(getElement('nextbotImage').files[0]);
        await loadAudioFiles();
        
        setTimeout(() => {
            initGame(nextbotURL);
            getElement('loading').style.display = 'none';
        }, 500);
        
    } catch (error) {
        getElement('loading').style.display = 'none';
        alert("Error loading game: " + error.message);
    }
}

async function loadAudioFiles() {
    if (!audioContext) return;
    
    const bgMusicFile = getElement('bgMusic').files[0];
    const nextbotSoundsFiles = getElement('nextbotSounds').files;
    
    if (bgMusic) {
        bgMusic.stop();
    }
    
    if (bgMusicFile) {
        bgMusic = await loadAudioFile(bgMusicFile, musicGain);
        if (bgMusic) {
            bgMusic.loop = true;
            bgMusic.start();
        }
    }
    
    nextbotAudio = [];
    
    for (let i = 0; i < nextbotSoundsFiles.length; i++) {
        const sound = await loadAudioFile(nextbotSoundsFiles[i], sfxGain);
        if (sound) nextbotAudio.push(sound);
    }
}

function loadAudioFile(file, destination) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            audioContext.decodeAudioData(e.target.result, function(buffer) {
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(destination);
                resolve(source);
            });
        };
        reader.readAsArrayBuffer(file);
    });
}

function playRandomNextbotSound() {
    if (nextbotAudio.length > 0 && !isMuted && !isDead) {
        const sound = nextbotAudio[Math.floor(Math.random() * nextbotAudio.length)];
        const newSound = audioContext.createBufferSource();
        newSound.buffer = sound.buffer;
        newSound.connect(sfxGain);
        newSound.start();
    }
}

function toggleMute() {
    isMuted = !isMuted;
    masterGain.gain.value = isMuted ? 0 : getElement('masterVolume').value / 100;
    getElement('muteBtn').textContent = isMuted ? '🔇 Unmute' : '🔊 Mute';
}

function togglePause() {
    isPaused = !isPaused;
    getElement('pause-menu').style.display = isPaused ? 'flex' : 'none';
    getElement('hud').style.display = isPaused ? 'none' : 'block';
    getElement('crosshair').style.display = isPaused ? 'none' : 'block';
    getElement('audioControls').style.display = isPaused ? 'none' : 'block';
    
    if (isPaused) {
        document.exitPointerLock();
        getElement('pause-time').textContent = Math.floor(gameTime);
        getElement('pause-distance').textContent = Math.floor(distanceTraveled);
    }
}

function resumeGame() {
    isPaused = false;
    getElement('pause-menu').style.display = 'none';
    getElement('hud').style.display = 'block';
    getElement('crosshair').style.display = 'block';
    getElement('audioControls').style.display = 'block';
}

function showDeathScreen() {
    isDead = true;
    document.exitPointerLock();
    
    getElement('death-time').textContent = Math.floor(gameTime);
    getElement('death-distance').textContent = Math.floor(distanceTraveled);
    
    getElement('death-overlay').style.display = 'flex';
    getElement('death-title').textContent = 'GAME OVER';
    
    getElement('hud').style.display = 'none';
    getElement('crosshair').style.display = 'none';
    getElement('audioControls').style.display = 'none';
    
    setTimeout(() => {
        getElement('death-buttons').style.display = 'flex';
    }, 2000);
}

function returnToMenu() {
    location.reload();
}

// ========== GAME INITIALIZATION ==========
function initGame(nextbotURL) {
    getElement("menu").style.display = "none";
    getElement("hud").style.display = "block";
    getElement("crosshair").style.display = "block";
    getElement("audioControls").style.display = "block";
    
    isDead = false;
    playerHealth = 100;
    distanceTraveled = 0;
    gameTime = 0;
    mapColliders = [];
    mapBounds = null;
    
    basePlayerSpeed = 0.35 * playerSpeedMultiplier;
    maxSpeed = basePlayerSpeed;
    baseBotSpeed = 0.3 * botSpeedMultiplier;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    scene.fog = new THREE.Fog(0x001122, 20, 200);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, floorY + 2, 5);
    camera.rotation.x = 0;
    lastPosition.copy(camera.position);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    setupMouseControls();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 300, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    if (saved3DMap) {
        load3DMap();
    } else {
        createRandomMap();
    }

    createNextbot(nextbotURL);

    animate();
    
    if (nextbotAudio.length > 0) {
        nextbotSoundInterval = setInterval(playRandomNextbotSound, 5000 + Math.random() * 10000);
    }
}

function load3DMap() {
    getElement('loading').textContent = 'Loading 3D Map...';
    
    const file = saved3DMap;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const objectURL = URL.createObjectURL(file);
    
    const onLoad = (model) => {
        // Apply the user's scale setting (now up to 20x!)
        model.scale.set(mapScale, mapScale, mapScale);
        
        // Get the bounds of the model after scaling
        const box = new THREE.Box3().setFromObject(model);
        mapBounds = box;
        
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center the model
        model.position.sub(center);
        
        console.log("Map loaded - Original size:", size);
        console.log("Scale applied:", mapScale + "x");
        console.log("Final map size:", size);
        
        // Find a safe spawn position INSIDE the map bounds
        let safeSpawnPosition = findSafeSpawnPosition(box, size);
        camera.position.set(safeSpawnPosition.x, floorY + 2, safeSpawnPosition.z);
        lastPosition.copy(camera.position);
        
        console.log("Player spawned at:", camera.position);
        console.log("Map bounds:", box.min, "to", box.max);
        
        // Warn if map is very small
        if (size.x < 50 || size.z < 50) {
            console.warn("Map is very small! Try increasing the scale to 10x-20x.");
        }
        
        // Add auto floor if enabled
        if (autoFloorEnabled) {
            const floorSize = Math.max(size.x, size.z) * 1.5;
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(floorSize, floorSize),
                new THREE.MeshLambertMaterial({ 
                    color: 0x1a3c2e,
                    side: THREE.DoubleSide
                })
            );
            floor.rotation.x = Math.PI / 2;
            floor.position.set(0, box.min.y - 0.1, 0);
            floor.receiveShadow = true;
            scene.add(floor);
        }
        
        // Process all meshes for collisions and materials
        model.traverse((child) => {
            if (child.isMesh) {
                // Keep original material if it exists
                if (!child.material) {
                    child.material = new THREE.MeshLambertMaterial({ 
                        color: 0x808080
                    });
                }
                
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Create collision box (already scaled)
                child.geometry.computeBoundingBox();
                const bbox = child.geometry.boundingBox.clone();
                
                // Apply world transformation
                const worldMatrix = new THREE.Matrix4();
                child.updateMatrixWorld();
                worldMatrix.copy(child.matrixWorld);
                bbox.applyMatrix4(worldMatrix);
                
                // Store for collision detection
                mapColliders.push(bbox);
            }
        });
        
        scene.add(model);
        currentMapModel = model;
        
        console.log("Colliders created:", mapColliders.length);
        getElement('loading').textContent = 'Loading...';
    };
    
    const onError = (error) => {
        console.error("Error loading 3D map:", error);
        alert("Failed to load 3D map. Using random map instead.");
        createRandomMap();
        getElement('loading').textContent = 'Loading...';
    };
    
    switch(fileExtension) {
        case 'gltf':
        case 'glb':
            const gltfLoader = new THREE.GLTFLoader();
            gltfLoader.load(objectURL, (gltf) => onLoad(gltf.scene), undefined, onError);
            break;
        case 'obj':
            const objLoader = new THREE.OBJLoader();
            objLoader.load(objectURL, onLoad, undefined, onError);
            break;
        case 'fbx':
            const fbxLoader = new THREE.FBXLoader();
            fbxLoader.load(objectURL, onLoad, undefined, onError);
            break;
        default:
            alert("Unsupported 3D format. Using random map.");
            createRandomMap();
    }
}

function findSafeSpawnPosition(box, size) {
    // First try: center of the map
    if (!isPositionBlocked(new THREE.Vector3(0, floorY + 2, 0))) {
        console.log("Using center spawn");
        return new THREE.Vector3(0, 0, 0);
    }
    
    // Calculate safe spawn radius (half of smaller dimension, minus player radius)
    const safeRadius = Math.min(Math.abs(size.x), Math.abs(size.z)) * 0.4 - 2;
    
    // Try positions in a circle around center
    const positions = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = Math.cos(angle) * safeRadius;
        const z = Math.sin(angle) * safeRadius;
        positions.push({ x, z });
    }
    
    for (let pos of positions) {
        const testPos = new THREE.Vector3(pos.x, floorY + 2, pos.z);
        if (!isPositionBlocked(testPos)) {
            console.log("Using radial spawn at angle");
            return testPos;
        }
    }
    
    // Try grid search within bounds
    const step = Math.max(size.x, size.z) / 10;
    for (let x = box.min.x + step; x < box.max.x; x += step) {
        for (let z = box.min.z + step; z < box.max.z; z += step) {
            const testPos = new THREE.Vector3(x, floorY + 2, z);
            if (!isPositionBlocked(testPos)) {
                console.log("Using grid search spawn");
                return testPos;
            }
        }
    }
    
    // Last resort: spawn at the highest point in the map
    console.warn("No safe spawn found! Using emergency spawn at highest point");
    return new THREE.Vector3(0, box.max.y + 5, 0);
}

function isPositionBlocked(position) {
    // Early exit if no colliders yet
    if (mapColliders.length === 0) return false;
    
    const playerBox = new THREE.Box3(
        new THREE.Vector3(position.x - 0.5, position.y - 1.8, position.z - 0.5),
        new THREE.Vector3(position.x + 0.5, position.y + 0.2, position.z + 0.5)
    );
    
    for (let collider of mapColliders) {
        if (playerBox.intersectsBox(collider)) {
            return true;
        }
    }
    
    return false;
}

function checkMapCollision(newPosition) {
    if (mapColliders.length === 0) return false;
    
    const playerBox = new THREE.Box3(
        new THREE.Vector3(newPosition.x - 0.4, newPosition.y - 0.8, newPosition.z - 0.4),
        new THREE.Vector3(newPosition.x + 0.4, newPosition.y + 1.8, newPosition.z + 0.4)
    );
    
    for (let i = 0; i < mapColliders.length; i++) {
        if (playerBox.intersectsBox(mapColliders[i])) {
            return true;
        }
    }
    
    // Also check if we're outside map bounds
    if (mapBounds) {
        if (newPosition.x < mapBounds.min.x + 1 || newPosition.x > mapBounds.max.x - 1 ||
            newPosition.z < mapBounds.min.z + 1 || newPosition.z > mapBounds.max.z - 1) {
            return true;
        }
    }
    
    return false;
}

function createRandomMap() {
    const size = 400;
    const halfSize = size / 2;
    
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size, 40, 40),
        new THREE.MeshLambertMaterial({ 
            color: 0x1a3c2e,
            side: THREE.DoubleSide
        })
    );
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x2a4c3e });
    const wallGeometry = new THREE.PlaneGeometry(size, 40);
    
    const walls = [
        { pos: [0, 20, -halfSize], rot: [0, 0, 0] },
        { pos: [0, 20, halfSize], rot: [0, Math.PI, 0] },
        { pos: [-halfSize, 20, 0], rot: [0, Math.PI/2, 0] },
        { pos: [halfSize, 20, 0], rot: [0, -Math.PI/2, 0] }
    ];
    
    walls.forEach(wallData => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(...wallData.pos);
        wall.rotation.set(...wallData.rot);
        wall.receiveShadow = true;
        scene.add(wall);
    });

    const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0x3a5c4e });
    for (let i = 0; i < 20; i++) {
        const height = Math.random() * 15 + 5;
        const obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(
                Math.random() * 10 + 5, 
                height, 
                Math.random() * 10 + 5
            ),
            obstacleMaterial
        );
        const maxPos = halfSize - 20;
        obstacle.position.set(
            Math.random() * (maxPos * 2) - maxPos,
            height / 2,
            Math.random() * (maxPos * 2) - maxPos
        );
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
    }
}

function createNextbot(imgURL) {
    const texLoader = new THREE.TextureLoader();
    texLoader.load(imgURL, function(texture) {
        const aspect = texture.image.width / texture.image.height;
        const botGeometry = new THREE.PlaneGeometry(8 * aspect, 8);
        const botMaterial = new THREE.MeshLambertMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide
        });
        bot = new THREE.Mesh(botGeometry, botMaterial);
        bot.position.set(0, 4, -80);
        bot.castShadow = true;
        scene.add(bot);
    }, undefined, function(error) {
        const botGeometry = new THREE.BoxGeometry(6, 6, 6);
        const botMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        bot = new THREE.Mesh(botGeometry, botMaterial);
        bot.position.set(0, 3, -80);
        bot.castShadow = true;
        scene.add(bot);
    });
}

// ========== MOUSE CONTROLS ==========
function setupMouseControls() {
    const canvas = renderer.domElement;
    
    canvas.addEventListener('click', () => {
        if (!isMouseLocked && !isPaused && !isDead) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
}

function onPointerLockChange() {
    const canvas = renderer.domElement;
    isMouseLocked = document.pointerLockElement === canvas;
    getElement("crosshair").style.display = isMouseLocked && !isPaused && !isDead ? "block" : "none";
}

function onMouseMove(event) {
    if (!isMouseLocked || isPaused || isDead) return;
    
    const movementX = event.movementX || 0;
    yaw -= movementX * mouseSensitivity;
    camera.rotation.y += (yaw - camera.rotation.y) * 0.2;
    camera.rotation.x = 0;
}

// ========== KEYBOARD CONTROLS ==========
const keys = {};
window.onkeydown = e => {
    if (isPaused || isDead) return;
    
    const key = e.key.toLowerCase();
    keys[key] = true;
    
    if (e.code === 'Space' && isOnGround) {
        playerVelocityY = 0.8 * jumpHeightMultiplier;
        isOnGround = false;
    }
    
    if (key === 'shift') {
        maxSpeed = basePlayerSpeed * 1.8;
        acceleration = 0.2;
    }
};

window.onkeyup = e => {
    const key = e.key.toLowerCase();
    keys[key] = false;
    
    if (key === 'shift') {
        maxSpeed = basePlayerSpeed;
        acceleration = 0.15;
    }
};

// ========== GAME LOOP ==========
function animate() {
    requestAnimationFrame(animate);
    
    if (isPaused || isDead) return;
    
    gameTime += 1/60;
    getElement('time').textContent = Math.floor(gameTime);
    
    if (isMouseLocked) {
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        right.crossVectors(camera.up, forward).normalize();
        
        velocity.multiplyScalar(friction);
        
        if (keys["w"]) velocity.add(forward.clone().multiplyScalar(acceleration));
        if (keys["s"]) velocity.add(forward.clone().multiplyScalar(-acceleration));
        if (keys["a"]) velocity.add(right.clone().multiplyScalar(acceleration));
        if (keys["d"]) velocity.add(right.clone().multiplyScalar(-acceleration));
        
        if (velocity.length() > maxSpeed) {
            velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        const oldPosition = camera.position.clone();
        
        // Try X movement
        const newPositionX = camera.position.clone();
        newPositionX.x += velocity.x;
        if (!checkMapCollision(newPositionX)) {
            camera.position.x = newPositionX.x;
        }
        
        // Try Z movement
        const newPositionZ = camera.position.clone();
        newPositionZ.z += velocity.z;
        if (!checkMapCollision(newPositionZ)) {
            camera.position.z = newPositionZ.z;
        }
        
        const currentSpeed = Math.round(velocity.length() * 200);
        getElement('speed').textContent = currentSpeed;
        
        playerVelocityY += gravity;
        camera.position.y += playerVelocityY;
        
        const verticalCheckPos = camera.position.clone();
        if (checkMapCollision(verticalCheckPos)) {
            camera.position.y = oldPosition.y;
            playerVelocityY = 0;
            isOnGround = true;
        } else if (camera.position.y <= floorY) {
            camera.position.y = floorY;
            playerVelocityY = 0;
            isOnGround = true;
        } else {
            isOnGround = false;
        }
        
        distanceTraveled += camera.position.distanceTo(lastPosition) * 0.5;
        lastPosition.copy(camera.position);
        getElement('distance').textContent = Math.floor(distanceTraveled);
        
        if (bot) {
            botVelocityY += gravity;
            bot.position.y += botVelocityY;
            
            if (bot.position.y <= 4) {
                bot.position.y = 4;
                botVelocityY = 0;
            }
            
            const dir = new THREE.Vector3();
            dir.subVectors(camera.position, bot.position).normalize();
            
            let currentBotSpeed = baseBotSpeed;
            const distanceToPlayer = bot.position.distanceTo(camera.position);
            
            if (distanceToPlayer < 20) {
                currentBotSpeed *= 2;
            }
            
            if (Math.random() < 0.02) {
                currentBotSpeed *= 3;
            }
            
            dir.y = 0;
            bot.position.add(dir.multiplyScalar(currentBotSpeed));
            
            const targetLook = camera.position.clone();
            targetLook.y = bot.position.y;
            bot.lookAt(targetLook);
            
            if (Math.random() < 0.01 && bot.position.y <= 4.1) {
                botVelocityY = 0.6;
            }
            
            if (distanceToPlayer < 8) {
                playerHealth -= 2;
                getElement('health').textContent = Math.max(0, Math.floor(playerHealth));
                
                const shake = (8 - distanceToPlayer) / 2;
                camera.position.x += (Math.random() - 0.5) * shake;
                camera.position.z += (Math.random() - 0.5) * shake;
                
                getElement("hud").style.color = '#ff0000';
                setTimeout(() => {
                    getElement("hud").style.color = 'white';
                }, 100);
                
                if (playerHealth <= 0 && !isDead) {
                    showDeathScreen();
                }
            }
            
            if (distanceToPlayer > 80 && Math.random() < 0.005) {
                const angle = Math.random() * Math.PI * 2;
                const teleportDistance = 20 + Math.random() * 30;
                bot.position.set(
                    camera.position.x + Math.cos(angle) * teleportDistance,
                    4,
                    camera.position.z + Math.sin(angle) * teleportDistance
                );
            }
        }
        
        // Keep in bounds for random maps
        if (!saved3DMap) {
            const bounds = 180;
            if (camera.position.x > bounds) camera.position.x = bounds;
            if (camera.position.x < -bounds) camera.position.x = -bounds;
            if (camera.position.z > bounds) camera.position.z = bounds;
            if (camera.position.z < -bounds) camera.position.z = -bounds;
        }
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.onresize = () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
};
