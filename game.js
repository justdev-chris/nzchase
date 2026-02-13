// ========== GAME STATE ==========
let scene, camera, renderer;
let nextbots = []; // Array for multiple nextbots
let playerVelocityY = 0;
let botVelocities = []; // Array for bot velocities
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
let mapScale = 10.0;

// ========== AUDIO SYSTEM ==========
let audioContext;
let bgMusic, nextbotAudio = []; // Array for all bot sounds
let masterGain, musicGain, sfxGain;
let isMuted = false;
let nextbotSoundIntervals = []; // Separate intervals for each bot

// ========== FILE STORAGE ==========
let savedNextbotImages = []; // Array for 5 images
let savedBgMusic = null;
let savedNextbotSounds = []; // Array for 5 sound files
let saved3DMap = null;
let autoFloorEnabled = true;

// ========== COLLISION SYSTEM ==========
let currentMapModel = null;
let mapColliders = [];
let mapBounds = null;

// ========== MAZE GENERATION ==========
let mazeWalls = [];
let mazeSize = 60; // Bigger maze!
let cellSize = 8; // Size of each maze cell
let wallHeight = 5;

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
            
            if (settings.bgMusicName) {
                getElement('lastBgMusicName').textContent = settings.bgMusicName;
                getElement('lastBgMusicPreview').style.display = 'block';
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
        bgMusicName: savedBgMusic ? savedBgMusic.name : null,
        map3dName: saved3DMap ? saved3DMap.name : null
    };
    
    localStorage.setItem('nzchase_settings', JSON.stringify(settings));
}

function clearSavedSettings() {
    localStorage.removeItem('nzchase_settings');
    savedNextbotImages = [];
    savedBgMusic = null;
    savedNextbotSounds = [];
    saved3DMap = null;
    
    getElement('lastBgMusicPreview').style.display = 'none';
    getElement('lastMapPreview').style.display = 'none';
    
    getElement('playerSpeed').value = 100;
    getElement('jumpHeight').value = 100;
    getElement('botSpeed').value = 100;
    getElement('masterVolume').value = 50;
    getElement('mapScale').value = 10.0;
    getElement('autoFloor').checked = true;
    
    playerSpeedMultiplier = 1;
    jumpHeightMultiplier = 1;
    botSpeedMultiplier = 1;
    mapScale = 10.0;
    autoFloorEnabled = true;
    
    getElement('playerSpeedValue').textContent = '100%';
    getElement('jumpHeightValue').textContent = '100%';
    getElement('botSpeedValue').textContent = '100%';
    getElement('volumeDisplay').textContent = '50%';
    getElement('mapScaleValue').textContent = '10.0x';
    
    alert("Settings cleared!");
}

function setupEventListeners() {
    // Nextbot 1-5 image inputs
    for (let i = 1; i <= 5; i++) {
        const imgInput = getElement(`nextbotImage${i}`);
        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    savedNextbotImages[i-1] = e.target.files[0];
                }
                updatePlayButton();
            });
        }
        
        const soundInput = getElement(`nextbotSound${i}`);
        if (soundInput) {
            soundInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    savedNextbotSounds[i-1] = e.target.files[0];
                }
            });
        }
    }
    
    getElement('bgMusic').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            savedBgMusic = e.target.files[0];
        }
    });
    
    getElement('map3d').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            saved3DMap = e.target.files[0];
        }
    });
    
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
    // Check if at least nextbot #1 has an image
    const hasFirstImage = getElement('nextbotImage1').files && getElement('nextbotImage1').files[0];
    getElement('playBtn').disabled = !hasFirstImage;
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
        
        // Collect all nextbot images that exist
        let nextbotURLs = [];
        for (let i = 1; i <= 5; i++) {
            const imgInput = getElement(`nextbotImage${i}`);
            if (imgInput && imgInput.files && imgInput.files[0]) {
                nextbotURLs.push(URL.createObjectURL(imgInput.files[0]));
            }
        }
        
        await loadAudioFiles();
        
        setTimeout(() => {
            initGame(nextbotURLs);
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
    
    // Load all nextbot sounds (up to 5)
    nextbotAudio = [];
    for (let i = 1; i <= 5; i++) {
        const soundInput = getElement(`nextbotSound${i}`);
        if (soundInput && soundInput.files && soundInput.files[0]) {
            const sound = await loadAudioFile(soundInput.files[0], sfxGain);
            if (sound) nextbotAudio.push(sound);
        }
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

function playNextbotSound(botIndex) {
    if (nextbotAudio.length > 0 && !isMuted && !isDead) {
        // Try to play the sound for this specific bot, or random if not available
        const soundIndex = botIndex < nextbotAudio.length ? botIndex : Math.floor(Math.random() * nextbotAudio.length);
        const sound = nextbotAudio[soundIndex];
        if (sound && sound.buffer) {
            const newSound = audioContext.createBufferSource();
            newSound.buffer = sound.buffer;
            newSound.connect(sfxGain);
            newSound.start();
        }
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
        getElement('pause-nextbots').textContent = nextbots.length;
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
    getElement('death-nextbots').textContent = nextbots.length;
    
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
function initGame(nextbotURLs) {
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
    nextbots = [];
    botVelocities = [];
    
    basePlayerSpeed = 0.35 * playerSpeedMultiplier;
    maxSpeed = basePlayerSpeed;
    baseBotSpeed = 0.3 * botSpeedMultiplier;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.Fog(0x111122, 30, 200);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, floorY + 2, 0);
    camera.rotation.x = 0;
    lastPosition.copy(camera.position);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    setupMouseControls();

    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    if (saved3DMap) {
        load3DMap();
    } else {
        generateMaze(); // Now generates an ACTUAL MAZE!
    }

    createAllNextbots(nextbotURLs);

    animate();
    
    // Set up random sound intervals for each bot
    nextbotSoundIntervals.forEach(interval => clearInterval(interval));
    nextbotSoundIntervals = [];
    
    if (nextbotAudio.length > 0) {
        for (let i = 0; i < nextbots.length; i++) {
            const interval = setInterval(() => {
                if (!isPaused && !isDead && nextbots[i]) {
                    playNextbotSound(i);
                }
            }, 8000 + Math.random() * 7000);
            nextbotSoundIntervals.push(interval);
        }
    }
}

// ========== MAZE GENERATION ==========
function generateMaze() {
    console.log("Generating maze...");
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(mazeSize * cellSize, mazeSize * cellSize);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x2a4a3a,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Generate a simple perfect maze using recursive backtracking
    const maze = generateMazeGrid(mazeSize, mazeSize);
    
    // Wall material with slight color variation
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8b6b4d });
    const wallMaterial2 = new THREE.MeshLambertMaterial({ color: 0x9b7b5d });
    
    // Create walls
    for (let y = 0; y < mazeSize; y++) {
        for (let x = 0; x < mazeSize; x++) {
            if (maze[y][x] === 1) { // It's a wall
                // Random height variation for visual interest
                const height = wallHeight + (Math.random() * 2 - 1);
                
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(cellSize - 0.5, height, cellSize - 0.5),
                    Math.random() > 0.5 ? wallMaterial : wallMaterial2
                );
                
                // Position in the center of the cell
                wall.position.set(
                    (x - mazeSize/2) * cellSize + cellSize/2,
                    height/2,
                    (y - mazeSize/2) * cellSize + cellSize/2
                );
                
                wall.castShadow = true;
                wall.receiveShadow = true;
                scene.add(wall);
                
                // Add to colliders
                const bbox = new THREE.Box3().setFromObject(wall);
                mapColliders.push(bbox);
                mazeWalls.push(wall);
            }
        }
    }
    
    // Add some random pillars/decorations in open spaces
    const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0xaa8866 });
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * mazeSize);
        const y = Math.floor(Math.random() * mazeSize);
        if (maze[y][x] === 0) { // Open space
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1.5, 3, 8),
                pillarMaterial
            );
            pillar.position.set(
                (x - mazeSize/2) * cellSize + cellSize/2,
                1.5,
                (y - mazeSize/2) * cellSize + cellSize/2
            );
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            scene.add(pillar);
        }
    }
    
    console.log("Maze generated with", mazeWalls.length, "walls");
}

function generateMazeGrid(width, height) {
    // Initialize grid with all walls
    const grid = [];
    for (let y = 0; y < height; y++) {
        grid[y] = [];
        for (let x = 0; x < width; x++) {
            grid[y][x] = 1; // 1 = wall
        }
    }
    
    // Random starting point
    const startX = Math.floor(Math.random() * Math.floor(width/2)) * 2 + 1;
    const startY = Math.floor(Math.random() * Math.floor(height/2)) * 2 + 1;
    
    function carve(x, y) {
        grid[y][x] = 0; // 0 = path
        
        const directions = [
            [0, -2], // up
            [2, 0],  // right
            [0, 2],  // down
            [-2, 0]  // left
        ];
        
        // Randomize directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
        for (let [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx > 0 && nx < width-1 && ny > 0 && ny < height-1 && grid[ny][nx] === 1) {
                // Carve the wall between
                grid[y + dy/2][x + dx/2] = 0;
                carve(nx, ny);
            }
        }
    }
    
    carve(startX, startY);
    
    // Ensure border is walls
    for (let x = 0; x < width; x++) {
        grid[0][x] = 1;
        grid[height-1][x] = 1;
    }
    for (let y = 0; y < height; y++) {
        grid[y][0] = 1;
        grid[y][width-1] = 1;
    }
    
    return grid;
}

function findRandomOpenPosition() {
    // Find a random open position in the maze
    const margin = 3 * cellSize;
    const centerOffset = (mazeSize * cellSize) / 2 - margin;
    
    return new THREE.Vector3(
        (Math.random() - 0.5) * centerOffset * 1.5,
        4,
        (Math.random() - 0.5) * centerOffset * 1.5
    );
}

function load3DMap() {
    getElement('loading').textContent = 'Loading 3D Map...';
    
    const file = saved3DMap;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const objectURL = URL.createObjectURL(file);
    
    const onLoad = (model) => {
        model.scale.set(mapScale, mapScale, mapScale);
        
        const box = new THREE.Box3().setFromObject(model);
        mapBounds = box;
        
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        model.position.sub(center);
        
        console.log("Map loaded - Original size:", size);
        console.log("Scale applied:", mapScale + "x");
        
        let safeSpawnPosition = findSafeSpawnPosition(box, size);
        camera.position.set(safeSpawnPosition.x, floorY + 2, safeSpawnPosition.z);
        lastPosition.copy(camera.position);
        
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
        
        model.traverse((child) => {
            if (child.isMesh) {
                if (!child.material) {
                    child.material = new THREE.MeshLambertMaterial({ color: 0x808080 });
                }
                
                child.castShadow = true;
                child.receiveShadow = true;
                
                child.geometry.computeBoundingBox();
                const bbox = child.geometry.boundingBox.clone();
                
                const worldMatrix = new THREE.Matrix4();
                child.updateMatrixWorld();
                worldMatrix.copy(child.matrixWorld);
                bbox.applyMatrix4(worldMatrix);
                
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
        alert("Failed to load 3D map. Using random maze instead.");
        generateMaze();
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
            alert("Unsupported 3D format. Using random maze.");
            generateMaze();
    }
}

function findSafeSpawnPosition(box, size) {
    if (!isPositionBlocked(new THREE.Vector3(0, floorY + 2, 0))) {
        return new THREE.Vector3(0, 0, 0);
    }
    
    const safeRadius = Math.min(Math.abs(size.x), Math.abs(size.z)) * 0.4 - 2;
    
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = Math.cos(angle) * safeRadius;
        const z = Math.sin(angle) * safeRadius;
        const testPos = new THREE.Vector3(x, floorY + 2, z);
        if (!isPositionBlocked(testPos)) {
            return testPos;
        }
    }
    
    const step = Math.max(size.x, size.z) / 10;
    for (let x = box.min.x + step; x < box.max.x; x += step) {
        for (let z = box.min.z + step; z < box.max.z; z += step) {
            const testPos = new THREE.Vector3(x, floorY + 2, z);
            if (!isPositionBlocked(testPos)) {
                return testPos;
            }
        }
    }
    
    return new THREE.Vector3(0, box.max.y + 5, 0);
}

function isPositionBlocked(position) {
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
    
    if (mapBounds) {
        if (newPosition.x < mapBounds.min.x + 1 || newPosition.x > mapBounds.max.x - 1 ||
            newPosition.z < mapBounds.min.z + 1 || newPosition.z > mapBounds.max.z - 1) {
            return true;
        }
    }
    
    return false;
}

function createAllNextbots(imageURLs) {
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
            
            nextbots.push(bot);
            botVelocities.push(0);
            
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
            
            nextbots.push(bot);
            botVelocities.push(0);
        });
    });
    
    getElement('nextbot-count').textContent = nextbots.length;
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
        
        // Update all nextbots
        nextbots.forEach((bot, index) => {
            if (!bot) return;
            
            // Gravity
            if (botVelocities[index] === undefined) botVelocities[index] = 0;
            botVelocities[index] += gravity;
            bot.position.y += botVelocities[index];
            
            if (bot.position.y <= 4) {
                bot.position.y = 4;
                botVelocities[index] = 0;
            }
            
            // Move toward player
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
                botVelocities[index] = 0.6;
            }
            
            // Damage player if too close
            if (distanceToPlayer < 8) {
                playerHealth -= 0.5;
                getElement('health').textContent = Math.max(0, Math.floor(playerHealth));
                
                const shake = (8 - distanceToPlayer) / 4;
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
        
        // Keep in bounds for maze
        if (!saved3DMap) {
            const bound = (mazeSize * cellSize) / 2 - 2;
            if (camera.position.x > bound) camera.position.x = bound;
            if (camera.position.x < -bound) camera.position.x = -bound;
            if (camera.position.z > bound) camera.position.z = bound;
            if (camera.position.z < -bound) camera.position.z = -bound;
        }
        
        // Update HUD
        getElement('nextbot-count').textContent = nextbots.length;
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