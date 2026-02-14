// ========== CORE.JS - MAIN GAME ENGINE ==========

// Game state
let scene, camera, renderer;
let playerVelocityY = 0;
const gravity = -0.03;
const floorY = 2.0;
let isOnGround = true;
window.playerHealth = 100;
let gameActive = false;

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
let dbReady = false;

// Collision
let currentMapModel = null;
let mapColliders = [];
let mapBounds = null;

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
    loadSavedFiles();
    setupEventListeners();
    setupAudioContext();
    updatePlayButton();
});

// ========== INDEXEDDB FUNCTIONS ==========
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NZChaseDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('savedFiles')) {
                db.createObjectStore('savedFiles', { keyPath: 'id' });
            }
        };
    });
}

async function saveFile(id, file) {
    if (!db || !file) return;
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const transaction = db.transaction(['savedFiles'], 'readwrite');
            const store = transaction.objectStore('savedFiles');
            
            const fileData = {
                id: id,
                name: file.name,
                type: file.type,
                data: e.target.result,
                timestamp: Date.now()
            };
            
            store.put(fileData);
            resolve();
        };
        reader.readAsArrayBuffer(file);
    });
}

async function loadFile(id) {
    if (!db) return null;
    
    return new Promise((resolve) => {
        const transaction = db.transaction(['savedFiles'], 'readonly');
        const store = transaction.objectStore('savedFiles');
        const request = store.get(id);
        
        request.onsuccess = () => {
            if (request.result) {
                const fileData = request.result;
                const blob = new Blob([fileData.data], { type: fileData.type });
                const file = new File([blob], fileData.name, { type: fileData.type });
                resolve(file);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => resolve(null);
    });
}

async function clearAllFiles() {
    if (!db) return;
    
    const transaction = db.transaction(['savedFiles'], 'readwrite');
    const store = transaction.objectStore('savedFiles');
    store.clear();
}

async function loadSavedFiles() {
    try {
        await initDB();
        dbReady = true;
        
        // Load nextbot images
        for (let i = 1; i <= 5; i++) {
            const file = await loadFile(`nextbot${i}`);
            if (file) {
                savedNextbotImages[i-1] = file;
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                getElement(`nextbotImage${i}`).files = dataTransfer.files;
            }
            
            const soundFile = await loadFile(`nextbotSound${i}`);
            if (soundFile) {
                savedNextbotSounds[i-1] = soundFile;
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(soundFile);
                getElement(`nextbotSound${i}`).files = dataTransfer.files;
            }
        }
        
        // Load background music
        const bgFile = await loadFile('bgMusic');
        if (bgFile) {
            savedBgMusic = bgFile;
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(bgFile);
            getElement('bgMusic').files = dataTransfer.files;
        }
        
        // Load map
        const mapFile = await loadFile('map3d');
        if (mapFile) {
            saved3DMap = mapFile;
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(mapFile);
            getElement('map3d').files = dataTransfer.files;
        }
        
        updatePlayButton();
        console.log("Saved files loaded");
    } catch (e) {
        console.error("Failed to load saved files:", e);
    }
}

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
    if (dbReady) clearAllFiles();
    
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
            imgInput.addEventListener('change', async (e) => {
                if (e.target.files[0]) {
                    savedNextbotImages[i-1] = e.target.files[0];
                    if (dbReady) await saveFile(`nextbot${i}`, e.target.files[0]);
                }
                updatePlayButton();
            });
        }
        
        const soundInput = getElement(`nextbotSound${i}`);
        if (soundInput) {
            soundInput.addEventListener('change', async (e) => {
                if (e.target.files[0]) {
                    savedNextbotSounds[i-1] = e.target.files[0];
                    if (dbReady) await saveFile(`nextbotSound${i}`, e.target.files[0]);
                }
            });
        }
    }
    
    getElement('bgMusic').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
            savedBgMusic = e.target.files[0];
            if (dbReady) await saveFile('bgMusic', e.target.files[0]);
        }
    });
    
    getElement('map3d').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
            saved3DMap = e.target.files[0];
            if (dbReady) await saveFile('map3d', e.target.files[0]);
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
    gameActive = true;
    getElement("menu").style.display = "none";
    getElement("hud").style.display = "block";
    getElement("crosshair").style.display = "block";
    getElement("audioControls").style.display = "block";
    
    isDead = false;
    window.playerHealth = 100;
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
    // scene.fog = new THREE.Fog(0x111122, 30, 200);

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    scene.background = new THREE.Color(0x87CEEB);

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

function checkMapCollision(newPosition) {
    if (!currentMapModel) return false;
    
    const dir = new THREE.Vector3().subVectors(newPosition, camera.position).normalize();
    const distance = camera.position.distanceTo(newPosition);
    
    const raycaster = new THREE.Raycaster(camera.position, dir, 0, distance + 1);
    const intersects = raycaster.intersectObject(currentMapModel, true);
    
    return intersects.length > 0;
}

function load3DMap() {
    const loadingEl = getElement('loading');
    loadingEl.textContent = 'Loading 3D Map...';

    if (!saved3DMap) return;

    const fileExtension = saved3DMap.name.split('.').pop().toLowerCase();
    const objectURL = URL.createObjectURL(saved3DMap);

    const onModelLoad = (model) => {
        model.scale.set(mapScale, mapScale, mapScale);
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        scene.add(model);
        currentMapModel = model;
        mapBounds = box;
        
        if (autoFloorEnabled) {
            const size = box.getSize(new THREE.Vector3());
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(size.x * 2, size.z * 2),
                new THREE.MeshLambertMaterial({ color: 0x1a3c2e, side: THREE.DoubleSide })
            );
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(0, box.min.y - 0.1, 0);
            floor.receiveShadow = true;
            scene.add(floor);
        }
        
        camera.position.set(0, 5, 0);
        lastPosition.copy(camera.position);
        
        URL.revokeObjectURL(objectURL);
        loadingEl.textContent = 'Ready';
    };

    const onModelError = (err) => {
        console.error("Load error:", err);
        URL.revokeObjectURL(objectURL);
        if (typeof generateMaze === 'function') generateMaze(scene, mapColliders);
        loadingEl.textContent = 'Error';
    };

    if (fileExtension === 'gltf' || fileExtension === 'glb') {
        new THREE.GLTFLoader().load(objectURL, (gltf) => onModelLoad(gltf.scene), undefined, onModelError);
    } else if (fileExtension === 'obj') {
        new THREE.OBJLoader().load(objectURL, (obj) => onModelLoad(obj), undefined, onModelError);
    } else if (fileExtension === 'fbx') {
        new THREE.FBXLoader().load(objectURL, (fbx) => onModelLoad(fbx), undefined, onModelError);
    } else {
        onModelError("Unsupported format");
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
        const newVerticalPos = camera.position.y + playerVelocityY;
        
        const downRay = new THREE.Raycaster(
            new THREE.Vector3(camera.position.x, camera.position.y + 1, camera.position.z),
            new THREE.Vector3(0, -1, 0),
            0,
            5
        );
        
        let groundY = -1000;
        if (currentMapModel) {
            const groundHits = downRay.intersectObject(currentMapModel, true);
            if (groundHits.length > 0) {
                groundY = groundHits[0].point.y;
            }
        }
        
        if (newVerticalPos <= groundY + 1.8) {
            camera.position.y = groundY + 1.8;
            playerVelocityY = 0;
            isOnGround = true;
        } else {
            camera.position.y = newVerticalPos;
            isOnGround = false;
        }
        
        distanceTraveled += camera.position.distanceTo(lastPosition) * 0.5;
        lastPosition.copy(camera.position);
        getElement('distance').textContent = Math.floor(distanceTraveled);
        
        if (typeof updateNextbots === 'function') {
            updateNextbots(camera, window.playerHealth, isDead, showDeathScreen, baseBotSpeed, botSpeedMultiplier);
        }
        
        if (!saved3DMap && typeof mazeSize !== 'undefined' && typeof cellSize !== 'undefined') {
            const bound = (mazeSize * cellSize) / 2 - 2;
            if (camera.position.x > bound) camera.position.x = bound;
            if (camera.position.x < -bound) camera.position.x = -bound;
            if (camera.position.z > bound) camera.position.z = bound;
            if (camera.position.z < -bound) camera.position.z = -bound;
        }
        
        getElement('nextbot-count').textContent = window.nextbots ? window.nextbots.length : 0;
        getElement('health').textContent = Math.max(0, Math.floor(window.playerHealth));
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
