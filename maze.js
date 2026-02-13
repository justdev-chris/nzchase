// ========== MAZE.JS - MAZE GENERATOR ==========

let mazeSize = 60;
let cellSize = 8;
let wallHeight = 5;
let mazeWalls = [];

function generateMaze(scene, mapColliders) {
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
    const margin = 3 * cellSize;
    const centerOffset = (mazeSize * cellSize) / 2 - margin;
    
    return new THREE.Vector3(
        (Math.random() - 0.5) * centerOffset * 1.5,
        4,
        (Math.random() - 0.5) * centerOffset * 1.5
    );
}