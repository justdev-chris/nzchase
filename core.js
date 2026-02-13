// ========== CORE.JS - MAIN GAME ENGINE ==========

// Game state
let scene, camera, renderer;
let playerVelocityY = 0;
const gravity = -0.03;
const floorY = 2.0;
let isOnGround = true;
let playerHealth = 100;

// Speed variables
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

// Slider values
let playerSpeedMultiplier = 1;
let jumpHeightMultiplier = 1;
let botSpeedMultiplier = 1;
let mapScale = 10.0;

// Audio
let audioContext;
let bgMusic;
let masterGain, musicGain, sfxGain;
let isMuted = false;

// File storage
let savedNextbotImages = [];
let savedBgMusic = null;
let savedNextbotSounds = [];
let saved3DMap = null;
let autoFloorEnabled = true;

// Collision
let currentMapModel = null;
let mapColliders = [];
let mapBounds = null;

// Spawn picker
let spawnPickerActive = false;
let customSpawnPoint = null;
let spawnPreviewCamera = null;
let spawnPreviewScene = null;
let spawnPreviewRenderer = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let spawnMarker = null;
let spawnRing = null;

// UI helper
function getElement(id) {
    return document.getElementById(id);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (typeof THREE === 'undefined') {
        alert("Three.js failed to load! Please refresh the page.");
        return;
    }
    
    loadSavedSettings();
    loadCustomSpawn();
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
        autoFloor: getElement('autoFloor').checked
    };
    
    localStorage.setItem('nzchase_settings', JSON.stringify(settings));
}

function clearSavedSettings() {
    localStorage.removeItem('nzchase_settings');
    localStorage.removeItem('nzchase_spawn');
    
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
    
    // Reset spawn
    customSpawnPoint = null;
    getElement('spawnCoordinates').style.display = 'none';
    if (spawnMarker) {
        if (scene) {
            scene.remove(spawnMarker);
            scene.remove(spawnRing);
        }
        spawnMarker = null;
        spawnRing = null;
    }
    
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
            // Preload map for spawn picking
            preloadMapForSpawn(e.target.files[0]);
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
    
    // Spawn picker buttons
    getElement('pickSpawnBtn').addEventListener('click', activateSpawnPicker);
    getElement('resetSpawnBtn').addEventListener('click', resetSpawnPoint);
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && isMouseLocked && !isDead) {
            togglePause();
        }
    });
}

function preloadMapForSpawn(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const objectURL = URL.createObjectURL(file);
    
    const onLoad = (model) => {
        currentMapModel = model;
        currentMapModel.scale.set(mapScale, mapScale, mapScale);
    };
    
    switch(fileExtension) {
        case 'gltf':
        case 'glb':
            const gltfLoader = new THREE.GLTFLoader();
            gltfLoader.load(objectURL, (gltf) => onLoad(gltf.scene));
            break;
        case 'obj':
            const objLoader = new THREE.OBJLoader();
            objLoader.load(objectURL, onLoad);
            break;
        case 'fbx':
            const fbxLoader = new THREE.FBXLoader();
            fbxLoader.load(objectURL, onLoad);
            break;
    }
}

function activateSpawnPicker() {
    if (!saved3DMap || !currentMapModel) {
        alert("Please upload a 3D map first and wait for it to load!");
        return;
    }
    
    spawnPickerActive = true;
    getElement('pickSpawnBtn').textContent = '🔴 Click on map to set spawn';
    getElement('pickSpawnBtn').style.background = '#ff5555';
    
    // Create preview if not exists
    if (!spawnPreviewCamera) {
        createSpawnPreview();
    }
    
    getElement('spawnPreview').style.display = 'block';
}

function createSpawnPreview() {
    const container = getElement('spawnPreview');
    
    // Setup preview scene
    spawnPreviewScene = new THREE.Scene();
    spawnPreviewScene.background = new THREE.Color(0x222222);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404060);
    spawnPreviewScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    spawnPreviewScene.add(directionalLight);
    
    // Clone the map model for preview
    if (currentMapModel) {
        const previewModel = currentMapModel.clone();
        spawnPreviewScene.add(previewModel);
    }
    
    // Setup camera
    spawnPreviewCamera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    spawnPreviewCamera.position.set(20, 15, 20);
    spawnPreviewCamera.lookAt(0, 5, 0);
    
    // Setup renderer
    spawnPreviewRenderer = new THREE.WebGLRenderer({ antialias: true });
    spawnPreviewRenderer.setSize(container.clientWidth, container.clientHeight);
    spawnPreviewRenderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(spawnPreviewRenderer.domElement);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(50, 20, 0xff3366, 0x333333);
    spawnPreviewScene.add(gridHelper);
    
    // Mouse controls for preview
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    spawnPreviewRenderer.domElement.addEventListener('mousedown', (e) => {
        if (!spawnPickerActive) return;
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !spawnPickerActive || !spawnPreviewCamera) return;
        
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        // Rotate camera around center
        const radius = 30;
        const theta = Math.atan2(spawnPreviewCamera.position.z, spawnPreviewCamera.position.x);
        const phi = Math.acos(spawnPreviewCamera.position.y / radius);
        
        const newTheta = theta + deltaX * 0.01;
        const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + deltaY * 0.01));
        
        spawnPreviewCamera.position.x = radius * Math.sin(newPhi) * Math.cos(newTheta);
        spawnPreviewCamera.position.y = radius * Math.cos(newPhi);
        spawnPreviewCamera.position.z = radius * Math.sin(newPhi) * Math.sin(newTheta);
        
        spawnPreviewCamera.lookAt(0, 5, 0);
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Click handler for picking spawn
    spawnPreviewRenderer.domElement.addEventListener('click', (e) => {
        if (!spawnPickerActive || !spawnPreviewCamera || !spawnPreviewScene) return;
        
        // Calculate mouse position
        const rect = e.target.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Cast ray
        raycaster.setFromCamera(mouse, spawnPreviewCamera);
        
        // Find intersections
        const intersects = raycaster.intersectObjects(spawnPreviewScene.children, true);
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            
            // Add height offset
            customSpawnPoint = new THREE.Vector3(point.x, point.y + 2, point.z);
            
            // Update UI
            getElement('spawnX').textContent = customSpawnPoint.x.toFixed(1);
            getElement('spawnY').textContent = customSpawnPoint.y.toFixed(1);
            getElement('spawnZ').textContent = customSpawnPoint.z.toFixed(1);
            getElement('spawnCoordinates').style.display = 'block';
            
            // Add marker to preview
            addSpawnMarkerToPreview(point);
            
            // Deactivate picker
            spawnPickerActive = false;
            getElement('pickSpawnBtn').textContent = '🎯 Pick Spawn Point';
            getElement('pickSpawnBtn').style.background = '#ff3366';
            
            // Save to settings
            saveCustomSpawn(customSpawnPoint);
        }
    });
    
    // Animation loop for preview
    function animatePreview() {
        if (spawnPreviewRenderer && spawnPreviewScene && spawnPreviewCamera) {
            spawnPreviewRenderer.render(spawnPreviewScene, spawnPreviewCamera);
        }
        requestAnimationFrame(animatePreview);
    }
    animatePreview();
}

function addSpawnMarkerToPreview(position) {
    // Remove old marker
    if (window.previewMarker) {
        spawnPreviewScene.remove(window.previewMarker);
        spawnPreviewScene.remove(window.previewRing);
    }
    
    // Create sphere marker
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff3366,
        emissive: 0x440000
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    
    // Create ring
    const ringGeo = new THREE.TorusGeometry(1.5, 0.2, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0x330000 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position);
    
    window.previewMarker = marker;
    window.previewRing = ring;
    
    spawnPreviewScene.add(marker);
    spawnPreviewScene.add(ring);
}

function resetSpawnPoint() {
    customSpawnPoint = null;
    getElement('spawnCoordinates').style.display = 'none';
    
    // Remove marker from preview
    if (window.previewMarker && spawnPreviewScene) {
        spawnPreviewScene.remove(window.previewMarker);
        spawnPreviewScene.remove(window.previewRing);
        window.previewMarker = null;
        window.previewRing = null;
    }
    
    // Remove marker from game if exists
    if (spawnMarker && scene) {
        scene.remove(spawnMarker);
        scene.remove(spawnRing);
        spawnMarker = null;
        spawnRing = null;
    }
    
    localStorage.removeItem('nzchase_spawn');
}

function saveCustomSpawn(point) {
    const spawnData = {
        x: point.x,
        y: point.y,
        z: point.z
    };
    localStorage.setItem('nzchase_spawn', JSON.stringify(spawnData));
}

function loadCustomSpawn() {
    const saved = localStorage.getItem('nzchase_spawn');
    if (saved) {
        try {
            const point = JSON.parse(saved);
            customSpawnPoint = new THREE.Vector3(point.x, point.y, point.z);
            
            getElement('spawnX').textContent = point.x.toFixed(1);
            getElement('spawnY').textContent = point.y.toFixed(1);
            getElement('spawnZ').textContent = point.z.toFixed(1);
            getElement('spawnCoordinates').style.display = 'block';
        } catch (e) {
            console.error("Failed to load spawn point", e);
        }
    }
}

function updatePlayButton() {
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
    
    window.nextbotAudio = [];
    for (let i = 1; i <= 5; i++) {
        const soundInput = getElement(`nextbotSound${i}`);
        if (soundInput && soundInput.files && soundInput.files[0]) {
            const sound = await loadAudioFile(soundInput.files[0], sfxGain);
            if (sound) window.nextbotAudio.push(sound);
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
        getElement('pause-nextbots').textContent = window.nextbots ? window.nextbots.length : 0;
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
    getElement('death-nextbots').textContent = window.nextbots ? window.nextbots.length : 0;
    
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
    window.nextbots = [];
    window.botVelocities = [];
    
    basePlayerSpeed = 0.35 * playerSpeedMultiplier;
    maxSpeed = basePlayerSpeed;
    baseBotSpeed = 0.3 * botSpeedMultiplier;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.Fog(0x111122, 30, 200);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Set spawn position
    if (customSpawnPoint && saved3DMap) {
        camera.position.copy(customSpawnPoint);
        addSpawnMarkerToGame(customSpawnPoint);
    } else {
        camera.position.set(0, floorY + 2, 0);
    }
    
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
        if (typeof generateMaze === 'function') {
            generateMaze(scene, mapColliders);
        }
    }

    if (typeof createAllNextbots === 'function') {
        createAllNextbots(nextbotURLs, scene, window.nextbots, window.botVelocities);
    }

    if (typeof setupNextbotSounds === 'function') {
        setupNextbotSounds();
    }

    animate();
}

function addSpawnMarkerToGame(position) {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        emissive: 0x004400
    });
    spawnMarker = new THREE.Mesh(geometry, material);
    spawnMarker.position.copy(position);
    
    const ringGeo = new THREE.TorusGeometry(1.5, 0.2, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 });
    spawnRing = new THREE.Mesh(ringGeo, ringMat);
    spawnRing.rotation.x = Math.PI / 2;
    spawnRing.position.copy(position);
    
    scene.add(spawnMarker);
    scene.add(spawnRing);
}

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
        model.position.sub(center);
        
        if (autoFloorEnabled) {
            const size = box.getSize(new THREE.Vector3());
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
        
        getElement('loading').textContent = 'Loading...';
    };
    
    const onError = (error) => {
        console.error("Error loading 3D map:", error);
        alert("Failed to load 3D map. Using random maze instead.");
        if (typeof generateMaze === 'function') {
            generateMaze(scene, mapColliders);
        }
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
            if (typeof generateMaze === 'function') {
                generateMaze(scene, mapColliders);
            }
    }
}

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
        
        const newPositionX = camera.position.clone();
        newPositionX.x += velocity.x;
        if (!checkMapCollision(newPositionX)) {
            camera.position.x = newPositionX.x;
        }
        
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
        
        if (typeof updateNextbots === 'function') {
            updateNextbots(camera, playerHealth, isDead, showDeathScreen, baseBotSpeed, botSpeedMultiplier);
        }
        
        if (!saved3DMap && typeof mazeSize !== 'undefined' && typeof cellSize !== 'undefined') {
            const bound = (mazeSize * cellSize) / 2 - 2;
            if (camera.position.x > bound) camera.position.x = bound;
            if (camera.position.x < -bound) camera.position.x = -bound;
            if (camera.position.z > bound) camera.position.z = bound;
            if (camera.position.z < -bound) camera.position.z = -bound;
        }
        
        getElement('nextbot-count').textContent = window.nextbots ? window.nextbots.length : 0;
        getElement('health').textContent = Math.max(0, Math.floor(playerHealth));
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