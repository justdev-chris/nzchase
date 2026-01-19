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

// ========== UI ELEMENT GETTERS (SAFE) ==========
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    // Wait for DOM to be fully loaded
    setTimeout(() => {
        if (typeof THREE === 'undefined') {
            console.error("Three.js failed to load!");
            alert("Three.js library failed to load. Please refresh the page or check your internet connection.");
            return;
        }
        
        loadSavedSettings();
        setupEventListeners();
        setupAudioContext();
        updatePlayButton();
    }, 100);
});

function loadSavedSettings() {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('nzchase_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            
            // Load slider values (with null checks)
            const playerSpeedSlider = getElement('playerSpeed');
            const jumpHeightSlider = getElement('jumpHeight');
            const botSpeedSlider = getElement('botSpeed');
            const masterVolumeSlider = getElement('masterVolume');
            
            if (settings.playerSpeed !== undefined && playerSpeedSlider) {
                playerSpeedSlider.value = settings.playerSpeed;
                playerSpeedMultiplier = settings.playerSpeed / 100;
                const playerSpeedValue = getElement('playerSpeedValue');
                if (playerSpeedValue) playerSpeedValue.textContent = settings.playerSpeed + '%';
            }
            
            if (settings.jumpHeight !== undefined && jumpHeightSlider) {
                jumpHeightSlider.value = settings.jumpHeight;
                jumpHeightMultiplier = settings.jumpHeight / 100;
                const jumpHeightValue = getElement('jumpHeightValue');
                if (jumpHeightValue) jumpHeightValue.textContent = settings.jumpHeight + '%';
            }
            
            if (settings.botSpeed !== undefined && botSpeedSlider) {
                botSpeedSlider.value = settings.botSpeed;
                botSpeedMultiplier = settings.botSpeed / 100;
                const botSpeedValue = getElement('botSpeedValue');
                if (botSpeedValue) botSpeedValue.textContent = settings.botSpeed + '%';
            }
            
            if (settings.masterVolume !== undefined && masterVolumeSlider) {
                masterVolumeSlider.value = settings.masterVolume;
                const volumeDisplay = getElement('volumeDisplay');
                if (volumeDisplay) volumeDisplay.textContent = settings.masterVolume + '%';
            }
            
            // Load audio file names for display
            if (settings.nextbotImageName) {
                const lastNextbotName = getElement('lastNextbotName');
                const lastNextbotPreview = getElement('lastNextbotPreview');
                if (lastNextbotName) lastNextbotName.textContent = settings.nextbotImageName;
                if (lastNextbotPreview) lastNextbotPreview.style.display = 'block';
            }
            
            if (settings.bgMusicName) {
                const lastBgMusicName = getElement('lastBgMusicName');
                const lastBgMusicPreview = getElement('lastBgMusicPreview');
                if (lastBgMusicName) lastBgMusicName.textContent = settings.bgMusicName;
                if (lastBgMusicPreview) lastBgMusicPreview.style.display = 'block';
            }
            
            if (settings.nextbotSoundsCount) {
                const lastSoundsCount = getElement('lastSoundsCount');
                const lastSoundsPreview = getElement('lastSoundsPreview');
                if (lastSoundsCount) lastSoundsCount.textContent = settings.nextbotSoundsCount;
                if (lastSoundsPreview) lastSoundsPreview.style.display = 'block';
            }
            
            console.log("Loaded saved settings");
            
        } catch (e) {
            console.error("Failed to load saved settings:", e);
        }
    }
}

function saveSettings() {
    const rememberCheckbox = getElement('rememberSettings');
    if (!rememberCheckbox || !rememberCheckbox.checked) return;
    
    const settings = {
        playerSpeed: getElement('playerSpeed') ? getElement('playerSpeed').value : 100,
        jumpHeight: getElement('jumpHeight') ? getElement('jumpHeight').value : 100,
        botSpeed: getElement('botSpeed') ? getElement('botSpeed').value : 100,
        masterVolume: getElement('masterVolume') ? getElement('masterVolume').value : 50,
        nextbotImageName: savedNextbotImage ? savedNextbotImage.name : null,
        bgMusicName: savedBgMusic ? savedBgMusic.name : null,
        nextbotSoundsCount: savedNextbotSounds.length
    };
    
    localStorage.setItem('nzchase_settings', JSON.stringify(settings));
    console.log("Settings saved");
}

function clearSavedSettings() {
    localStorage.removeItem('nzchase_settings');
    savedNextbotImage = null;
    savedBgMusic = null;
    savedNextbotSounds = [];
    
    // Reset UI
    const lastNextbotPreview = getElement('lastNextbotPreview');
    const lastBgMusicPreview = getElement('lastBgMusicPreview');
    const lastSoundsPreview = getElement('lastSoundsPreview');
    
    if (lastNextbotPreview) lastNextbotPreview.style.display = 'none';
    if (lastBgMusicPreview) lastBgMusicPreview.style.display = 'none';
    if (lastSoundsPreview) lastSoundsPreview.style.display = 'none';
    
    // Reset sliders to defaults
    const playerSpeedSlider = getElement('playerSpeed');
    const jumpHeightSlider = getElement('jumpHeight');
    const botSpeedSlider = getElement('botSpeed');
    const masterVolumeSlider = getElement('masterVolume');
    
    if (playerSpeedSlider) playerSpeedSlider.value = 100;
    if (jumpHeightSlider) jumpHeightSlider.value = 100;
    if (botSpeedSlider) botSpeedSlider.value = 100;
    if (masterVolumeSlider) masterVolumeSlider.value = 50;
    
    playerSpeedMultiplier = 1;
    jumpHeightMultiplier = 1;
    botSpeedMultiplier = 1;
    
    const playerSpeedValue = getElement('playerSpeedValue');
    const jumpHeightValue = getElement('jumpHeightValue');
    const botSpeedValue = getElement('botSpeedValue');
    const volumeDisplay = getElement('volumeDisplay');
    
    if (playerSpeedValue) playerSpeedValue.textContent = '100%';
    if (jumpHeightValue) jumpHeightValue.textContent = '100%';
    if (botSpeedValue) botSpeedValue.textContent = '100%';
    if (volumeDisplay) volumeDisplay.textContent = '50%';
    
    alert("All saved settings cleared!");
}

function setupEventListeners() {
    // Enable play button when nextbot image is uploaded
    const nextbotImageInput = getElement('nextbotImage');
    if (nextbotImageInput) {
        nextbotImageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                savedNextbotImage = e.target.files[0];
            }
            updatePlayButton();
        });
    }
    
    const bgMusicInput = getElement('bgMusic');
    if (bgMusicInput) {
        bgMusicInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                savedBgMusic = e.target.files[0];
            }
        });
    }
    
    const nextbotSoundsInput = getElement('nextbotSounds');
    if (nextbotSoundsInput) {
        nextbotSoundsInput.addEventListener('change', (e) => {
            savedNextbotSounds = Array.from(e.target.files);
        });
    }
    
    // PLAYER SPEED SLIDER
    const playerSpeedSlider = getElement('playerSpeed');
    if (playerSpeedSlider) {
        playerSpeedSlider.addEventListener('input', (e) => {
            playerSpeedMultiplier = e.target.value / 100;
            const playerSpeedValue = getElement('playerSpeedValue');
            if (playerSpeedValue) playerSpeedValue.textContent = e.target.value + '%';
            saveSettings();
        });
    }
    
    // JUMP HEIGHT SLIDER
    const jumpHeightSlider = getElement('jumpHeight');
    if (jumpHeightSlider) {
        jumpHeightSlider.addEventListener('input', (e) => {
            jumpHeightMultiplier = e.target.value / 100;
            const jumpHeightValue = getElement('jumpHeightValue');
            if (jumpHeightValue) jumpHeightValue.textContent = e.target.value + '%';
            saveSettings();
        });
    }
    
    // BOT SPEED SLIDER
    const botSpeedSlider = getElement('botSpeed');
    if (botSpeedSlider) {
        botSpeedSlider.addEventListener('input', (e) => {
            botSpeedMultiplier = e.target.value / 100;
            const botSpeedValue = getElement('botSpeedValue');
            if (botSpeedValue) botSpeedValue.textContent = e.target.value + '%';
            saveSettings();
        });
    }
    
    // AUDIO VOLUME
    const masterVolumeSlider = getElement('masterVolume');
    if (masterVolumeSlider) {
        masterVolumeSlider.addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            const volumeDisplay = getElement('volumeDisplay');
            if (volumeDisplay) volumeDisplay.textContent = e.target.value + '%';
            if (masterGain) masterGain.gain.value = vol;
            saveSettings();
        });
    }
    
    // Clear memory button
    const clearMemoryBtn = getElement('clearMemoryBtn');
    if (clearMemoryBtn) {
        clearMemoryBtn.addEventListener('click', clearSavedSettings);
    }
    
    // Play button
    const playBtn = getElement('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', startGame);
    }
    
    // Pause menu buttons
    const resumeBtn = getElement('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
    
    const pauseRestartBtn = getElement('pauseRestartBtn');
    if (pauseRestartBtn) pauseRestartBtn.addEventListener('click', restartGame);
    
    const pauseQuitBtn = getElement('pauseQuitBtn');
    if (pauseQuitBtn) pauseQuitBtn.addEventListener('click', returnToMenu);
    
    // Death screen buttons
    const restartBtn = getElement('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    
    const menuBtn = getElement('menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', returnToMenu);
    
    // Audio controls
    const muteBtn = getElement('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
    
    const musicVolumeSlider = getElement('musicVolume');
    if (musicVolumeSlider) {
        musicVolumeSlider.addEventListener('input', (e) => {
            if (musicGain) musicGain.gain.value = e.target.value / 100;
        });
    }
    
    const sfxVolumeSlider = getElement('sfxVolume');
    if (sfxVolumeSlider) {
        sfxVolumeSlider.addEventListener('input', (e) => {
            if (sfxGain) sfxGain.gain.value = e.target.value / 100;
        });
    }
    
    // Pause with ESC
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && isMouseLocked && !isDead) {
            togglePause();
        }
    });
}

function updatePlayButton() {
    const playBtn = getElement('playBtn');
    const nextbotImageInput = getElement('nextbotImage');
    if (playBtn && nextbotImageInput) {
        playBtn.disabled = !nextbotImageInput.files[0];
    }
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
        
        const masterVolumeSlider = getElement('masterVolume');
        if (masterVolumeSlider) {
            masterGain.gain.value = masterVolumeSlider.value / 100;
        } else {
            masterGain.gain.value = 0.5;
        }
        
        musicGain.gain.value = 0.7;
        sfxGain.gain.value = 0.8;
    } catch (e) {
        console.log("Audio not supported:", e);
    }
}

async function startGame() {
    const loadingDiv = getElement('loading');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    try {
        const nextbotImageInput = getElement('nextbotImage');
        if (!nextbotImageInput || !nextbotImageInput.files[0]) {
            alert("Please upload a Nextbot image first!");
            if (loadingDiv) loadingDiv.style.display = 'none';
            return;
        }
        
        // Save current settings
        saveSettings();
        
        const nextbotURL = URL.createObjectURL(nextbotImageInput.files[0]);
        await loadAudioFiles();
        
        setTimeout(() => {
            initGame(nextbotURL);
            if (loadingDiv) loadingDiv.style.display = 'none';
        }, 500);
        
    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        alert("Error loading game: " + error.message);
    }
}

async function loadAudioFiles() {
    if (!audioContext) return;
    
    const bgMusicInput = getElement('bgMusic');
    const nextbotSoundsInput = getElement('nextbotSounds');
    
    const bgMusicFile = bgMusicInput ? bgMusicInput.files[0] : null;
    const nextbotSoundsFiles = nextbotSoundsInput ? nextbotSoundsInput.files : [];
    
    // Stop any existing music
    if (bgMusic) {
        bgMusic.stop();
    }
    
    // Load background music
    if (bgMusicFile) {
        bgMusic = await loadAudioFile(bgMusicFile, musicGain);
        if (bgMusic) {
            bgMusic.loop = true;
            bgMusic.start();
        }
    }
    
    // Clear existing sounds
    nextbotAudio = [];
    
    // Load nextbot sounds
    if (nextbotSoundsFiles.length > 0) {
        for (let i = 0; i < nextbotSoundsFiles.length; i++) {
            const sound = await loadAudioFile(nextbotSoundsFiles[i], sfxGain);
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
    const masterVolumeSlider = getElement('masterVolume');
    if (masterGain) {
        masterGain.gain.value = isMuted ? 0 : (masterVolumeSlider ? masterVolumeSlider.value / 100 : 0.5);
    }
    
    const muteBtn = getElement('muteBtn');
    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇 Unmute' : '🔊 Mute';
    }
}

function togglePause() {
    isPaused = !isPaused;
    const pauseMenu = getElement('pause-menu');
    const hud = getElement('hud');
    const crosshair = getElement('crosshair');
    const audioControls = getElement('audioControls');
    
    if (pauseMenu) pauseMenu.style.display = isPaused ? 'flex' : 'none';
    if (hud) hud.style.display = isPaused ? 'none' : 'block';
    if (crosshair) crosshair.style.display = isPaused ? 'none' : 'block';
    if (audioControls) audioControls.style.display = isPaused ? 'none' : 'block';
    
    if (isPaused) {
        document.exitPointerLock();
        const pauseTime = getElement('pause-time');
        const pauseDistance = getElement('pause-distance');
        if (pauseTime) pauseTime.textContent = Math.floor(gameTime);
        if (pauseDistance) pauseDistance.textContent = Math.floor(distanceTraveled);
    }
}

function resumeGame() {
    isPaused = false;
    const pauseMenu = getElement('pause-menu');
    const hud = getElement('hud');
    const crosshair = getElement('crosshair');
    const audioControls = getElement('audioControls');
    
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (hud) hud.style.display = 'block';
    if (crosshair) crosshair.style.display = 'block';
    if (audioControls) audioControls.style.display = 'block';
}

function showDeathScreen() {
    isDead = true;
    document.exitPointerLock();
    
    // Update death screen stats
    const deathTime = getElement('death-time');
    const deathDistance = getElement('death-distance');
    const deathOverlay = getElement('death-overlay');
    const deathTitle = getElement('death-title');
    const deathButtons = getElement('death-buttons');
    const hud = getElement('hud');
    const crosshair = getElement('crosshair');
    const audioControls = getElement('audioControls');
    
    if (deathTime) deathTime.textContent = Math.floor(gameTime);
    if (deathDistance) deathDistance.textContent = Math.floor(distanceTraveled);
    
    // Show red overlay
    if (deathOverlay) deathOverlay.style.display = 'flex';
    if (deathTitle) deathTitle.textContent = 'GAME OVER';
    
    // Hide other UI elements
    if (hud) hud.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
    if (audioControls) audioControls.style.display = 'none';
    
    // Show buttons after 2 seconds
    setTimeout(() => {
        if (deathButtons) deathButtons.style.display = 'block';
    }, 2000);
}

function restartGame() {
    // Clear intervals
    if (nextbotSoundInterval) {
        clearInterval(nextbotSoundInterval);
    }
    
    // Stop music
    if (bgMusic) {
        bgMusic.stop();
    }
    
    // Reset game state
    isDead = false;
    isPaused = false;
    isMouseLocked = false;
    playerHealth = 100;
    distanceTraveled = 0;
    gameTime = 0;
    
    // Hide death screen
    const deathOverlay = getElement('death-overlay');
    const deathButtons = getElement('death-buttons');
    const pauseMenu = getElement('pause-menu');
    
    if (deathOverlay) deathOverlay.style.display = 'none';
    if (deathButtons) deathButtons.style.display = 'none';
    if (pauseMenu) pauseMenu.style.display = 'none';
    
    // Restart with same settings
    startGame();
}

function returnToMenu() {
    // Clear intervals
    if (nextbotSoundInterval) {
        clearInterval(nextbotSoundInterval);
    }
    
    // Stop music
    if (bgMusic) {
        bgMusic.stop();
    }
    
    // Reset game state
    isDead = false;
    isPaused = false;
    isMouseLocked = false;
    
    // Show menu, hide game elements
    const menu = getElement('menu');
    const deathOverlay = getElement('death-overlay');
    const pauseMenu = getElement('pause-menu');
    const hud = getElement('hud');
    const crosshair = getElement('crosshair');
    const audioControls = getElement('audioControls');
    
    if (menu) menu.style.display = 'flex';
    if (deathOverlay) deathOverlay.style.display = 'none';
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (hud) hud.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
    if (audioControls) audioControls.style.display = 'none';
    
    // Clean up Three.js
    if (renderer) {
        document.body.removeChild(renderer.domElement);
        renderer = null;
    }
    
    scene = null;
    camera = null;
    bot = null;
}

// ========== GAME INITIALIZATION ==========
function initGame(nextbotURL) {
    const menu = getElement('menu');
    const hud = getElement('hud');
    const crosshair = getElement('crosshair');
    const audioControls = getElement('audioControls');
    
    if (menu) menu.style.display = "none";
    if (hud) hud.style.display = "block";
    if (crosshair) crosshair.style.display = "block";
    if (audioControls) audioControls.style.display = "block";
    
    // Reset game state
    isDead = false;
    playerHealth = 100;
    distanceTraveled = 0;
    gameTime = 0;
    
    // APPLY SLIDER VALUES
    basePlayerSpeed = 0.35 * playerSpeedMultiplier;
    maxSpeed = basePlayerSpeed;
    baseBotSpeed = 0.3 * botSpeedMultiplier;
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    scene.fog = new THREE.Fog(0x001122, 20, 200);

    // Create camera
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, floorY, 5);
    camera.rotation.x = 0;
    lastPosition.copy(camera.position);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Setup mouse controls
    setupMouseControls();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 300, 100);
    scene.add(directionalLight);

    // Create map
    createMap();

    // Create Nextbot
    createNextbot(nextbotURL);

    // Start game loop
    animate();
    
    // Start nextbot sound interval
    if (nextbotAudio.length > 0) {
        nextbotSoundInterval = setInterval(playRandomNextbotSound, 5000 + Math.random() * 10000);
    }
}

function createMap() {
    const size = 400;
    const halfSize = size / 2;
    
    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size, 40, 40),
        new THREE.MeshLambertMaterial({ 
            color: 0x1a3c2e,
            side: THREE.DoubleSide
        })
    );
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Walls
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
        scene.add(wall);
    });

    // Obstacles
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
        scene.add(bot);
    }, undefined, function(error) {
        const botGeometry = new THREE.BoxGeometry(6, 6, 6);
        const botMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        bot = new THREE.Mesh(botGeometry, botMaterial);
        bot.position.set(0, 3, -80);
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
    const crosshair = getElement('crosshair');
    if (crosshair) {
        crosshair.style.display = isMouseLocked && !isPaused && !isDead ? "block" : "none";
    }
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
    const timeElement = getElement('time');
    if (timeElement) timeElement.textContent = Math.floor(gameTime);
    
    if (isMouseLocked) {
        // Player movement
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        right.crossVectors(camera.up, forward).normalize();
        
        // Apply friction first
        velocity.multiplyScalar(friction);
        
        // Then add acceleration based on keys
        if (keys["w"]) velocity.add(forward.clone().multiplyScalar(acceleration));
        if (keys["s"]) velocity.add(forward.clone().multiplyScalar(-acceleration));
        if (keys["a"]) velocity.add(right.clone().multiplyScalar(acceleration));
        if (keys["d"]) velocity.add(right.clone().multiplyScalar(-acceleration));
        
        // Cap speed based on current maxSpeed
        if (velocity.length() > maxSpeed) {
            velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Move camera
        camera.position.add(velocity);
        
        // Update HUD speed display
        const currentSpeed = Math.round(velocity.length() * 200);
        const speedElement = getElement('speed');
        if (speedElement) speedElement.textContent = currentSpeed;
        
        // Player gravity and jumping
        playerVelocityY += gravity;
        camera.position.y += playerVelocityY;
        
        if (camera.position.y <= floorY) {
            camera.position.y = floorY;
            playerVelocityY = 0;
            isOnGround = true;
        }
        
        // Distance tracking
        distanceTraveled += camera.position.distanceTo(lastPosition) * 0.5;
        lastPosition.copy(camera.position);
        const distanceElement = getElement('distance');
        if (distanceElement) distanceElement.textContent = Math.floor(distanceTraveled);
        
        // Nextbot AI
        if (bot) {
            // Apply gravity to bot
            botVelocityY += gravity;
            bot.position.y += botVelocityY;
            
            if (bot.position.y <= 4) {
                bot.position.y = 4;
                botVelocityY = 0;
            }
            
            // Bot movement
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
            
            // Collision with nextbot
            if (distanceToPlayer < 8) {
                playerHealth -= 2;
                const healthElement = getElement('health');
                if (healthElement) healthElement.textContent = Math.max(0, Math.floor(playerHealth));
                
                const shake = (8 - distanceToPlayer) / 2;
                camera.position.x += (Math.random() - 0.5) * shake;
                camera.position.z += (Math.random() - 0.5) * shake;
                
                const hud = getElement('hud');
                if (hud) {
                    hud.style.color = '#ff0000';
                    setTimeout(() => {
                        if (hud) hud.style.color = 'white';
                    }, 100);
                }
                
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
        
        // Keep in bounds
        const bounds = 180;
        if (camera.position.x > bounds) camera.position.x = bounds;
        if (camera.position.x < -bounds) camera.position.x = -bounds;
        if (camera.position.z > bounds) camera.position.z = bounds;
        if (camera.position.z < -bounds) camera.position.z = -bounds;
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
