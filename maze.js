// ========== MAZE.JS - MAZE GENERATOR ==========

let mazeSize = 40; // Slightly smaller for better performance
let cellSize = 10; // Bigger cells = thicker walls
let wallHeight = 20; // Higher walls
let wallThickness = 8; // Thicker walls
let mazeWalls = [];

function generateMaze(scene, mapColliders) {
    console.log("Generating solid maze...");
    
    // Create floor (thick so no falling through)
    const floorThickness = 5;
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(mazeSize * cellSize, floorThickness, mazeSize * cellSize),
        new THREE.MeshLambertMaterial({ color: 0x2a4a3a })
    );
    floor.position.set(0, -floorThickness/2, 0);
    floor.receiveShadow = true;
    floor.castShadow = true;
    scene.add(floor);
    
    // Add floor collider
    const floorBox = new THREE.Box3().setFromObject(floor);
    mapColliders.push(floorBox);
    
    // Generate maze pattern
    const maze = generateMazeGrid(mazeSize, mazeSize);
    
    // Wall material
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8b6b4d });
    
    // Create SOLID walls (no gaps)
    for (let y = 0; y < mazeSize; y++) {
        for (let x = 0; x < mazeSize; x++) {
            if (maze[y][x] === 1) { // Wall
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(cellSize - 0.5, wallHeight, cellSize - 0.5),
                    wallMaterial
                );
                
                wall.position.set(
                    (x - mazeSize/2) * cellSize + cellSize/2,
                    wallHeight/2,
                    (y - mazeSize/2) * cellSize + cellSize/2
                );
                
                wall.castShadow = true;
                wall.receiveShadow = true;
                scene.add(wall);
                
                // Add collider
                const bbox = new THREE.Box3().setFromObject(wall);
                mapColliders.push(bbox);
                mazeWalls.push(wall);
            }
        }
    }
    
    // Add OUTER WALLS (so you can't escape)
    const outerWallMaterial = new THREE.MeshLambertMaterial({ color: 0x5a3a2a });
    const outerSize = mazeSize * cellSize + 20;
    const outerHeight = wallHeight + 10;
    
    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(outerSize, outerHeight, 10),
        outerWallMaterial
    );
    northWall.position.set(0, outerHeight/2, -outerSize/2 - 5);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    scene.add(northWall);
    mapColliders.push(new THREE.Box3().setFromObject(northWall));
    
    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(outerSize, outerHeight, 10),
        outerWallMaterial
    );
    southWall.position.set(0, outerHeight/2, outerSize/2 + 5);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    scene.add(southWall);
    mapColliders.push(new THREE.Box3().setFromObject(southWall));
    
    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(10, outerHeight, outerSize),
        outerWallMaterial
    );
    eastWall.position.set(outerSize/2 + 5, outerHeight/2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    scene.add(eastWall);
    mapColliders.push(new THREE.Box3().setFromObject(eastWall));
    
    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(10, outerHeight, outerSize),
        outerWallMaterial
    );
    westWall.position.set(-outerSize/2 - 5, outerHeight/2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    scene.add(westWall);
    mapColliders.push(new THREE.Box3().setFromObject(westWall));
    
    // Add ROOF
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(outerSize, 5, outerSize),
        new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.3 })
    );
    roof.position.set(0, outerHeight + 5, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);
    
    // Add some lights in the maze
    const lightCount = 10;
    for (let i = 0; i < lightCount; i++) {
        const light = new THREE.PointLight(0xffaa66, 1, 50);
        const x = (Math.random() - 0.5) * (mazeSize * cellSize * 0.8);
        const z = (Math.random() - 0.5) * (mazeSize * cellSize * 0.8);
        light.position.set(x, 10, z);
        scene.add(light);
        
        // Add a small sphere to show light source
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffaa66 })
        );
        sphere.position.copy(light.position);
        scene.add(sphere);
    }
    
    console.log("Solid maze generated with", mapColliders.length, "colliders");
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
    const margin = 3 * cellSize;
    const centerOffset = (mazeSize * cellSize) / 2 - margin;
    
    return new THREE.Vector3(
        (Math.random() - 0.5) * centerOffset * 1.5,
        5,
        (Math.random() - 0.5) * centerOffset * 1.5
    );
}
