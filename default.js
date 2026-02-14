// ========== DEFAULT.JS - Handles loading default map ==========

function loadDefaultMap(scene, mapColliders, camera, nextbotURLs) {
    console.log("Loading default map...");
    
    // Check if GLTFLoader exists
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error("GLTFLoader not loaded! Creating simple ground plane instead.");
        createSimpleGround(scene, camera, nextbotURLs);
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    
    loader.load('default.glb', 
        // Success callback
        (gltf) => {
            const model = gltf.scene;
            
            // Scale and center
            model.scale.set(100, 100, 100);
            
            // Compute bounds and center
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            
            model.position.sub(center);
            
            // Add to scene
            scene.add(model);
            
            // Set for collision (BOTH local and global)
            window.currentMapModel = model;
            currentMapModel = model; // Set local variable too!
            
            // Get ACTUAL floor height
            const floorY = box.min.y;
            console.log("Default map floor at y:", floorY);
            
            // Position camera on ACTUAL ground (floorY + 2)
            camera.position.set(0, floorY + 2, 0);
            
            console.log("Default map loaded successfully, camera at y:", camera.position.y);
            
            // Create nextbots after map is loaded
            if (typeof createAllNextbots === 'function' && nextbotURLs) {
                createAllNextbots(nextbotURLs, scene, window.nextbots, window.botVelocities);
            }
        },
        // Progress callback (optional)
        (xhr) => {
            console.log(`Default map: ${Math.round(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        // Error callback
        (error) => {
            console.error("Failed to load default map:", error);
            console.log("Creating simple ground plane as fallback");
            createSimpleGround(scene, camera, nextbotURLs);
        }
    );
}

// Fallback function if default.glb doesn't exist
function createSimpleGround(scene, camera, nextbotURLs) {
    console.log("Creating simple ground plane");
    
    // Create a checkerboard ground
    const gridSize = 200;
    const divisions = 20;
    
    // Main ground plane
    const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3a6b4a,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add grid for visibility
    const gridHelper = new THREE.GridHelper(gridSize, divisions, 0xffffff, 0x888888);
    gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting
    scene.add(gridHelper);
    
    // Add some simple walls/obstacles
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    
    // Add a few pillars
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            if (i === 0 && j === 0) continue; // Skip center
            
            const pillarGeo = new THREE.BoxGeometry(2, 5, 2);
            const pillar = new THREE.Mesh(pillarGeo, wallMaterial);
            pillar.position.set(i * 30, 2.5, j * 30);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            scene.add(pillar);
        }
    }
    
    // Set map model for collision (BOTH local and global)
    window.currentMapModel = ground;
    currentMapModel = ground; // Set local variable too!
    
    // Get ACTUAL ground height (ground is at y=0)
    const floorY = 0;
    console.log("Simple ground floor at y:", floorY);
    
    // Position camera on ACTUAL ground (floorY + 2)
    camera.position.set(0, floorY + 2, 0);
    
    console.log("Simple ground created, camera at y:", camera.position.y);
    
    // Create nextbots
    if (typeof createAllNextbots === 'function' && nextbotURLs) {
        createAllNextbots(nextbotURLs, scene, window.nextbots, window.botVelocities);
    }
}
