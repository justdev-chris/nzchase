// ========== SAVE.JS - IndexedDB Storage ==========

const DB_NAME = 'NZChaseDB';
const DB_VERSION = 1;
const STORE_NAME = 'savedFiles';

let db = null;

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Save a file to IndexedDB
function saveFile(id, file) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('DB not initialized');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const fileData = {
                id: id,
                name: file.name,
                type: file.type,
                data: e.target.result,
                timestamp: Date.now()
            };
            
            const request = store.put(fileData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        };
        reader.readAsArrayBuffer(file);
    });
}

// Load a file from IndexedDB
function loadFile(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('DB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = () => {
            if (request.result) {
                // Convert back to File object
                const fileData = request.result;
                const blob = new Blob([fileData.data], { type: fileData.type });
                const file = new File([blob], fileData.name, { type: fileData.type });
                resolve(file);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Get all saved file IDs
function getSavedFiles() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('DB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const files = {};
            request.result.forEach(item => {
                files[item.id] = {
                    name: item.name,
                    type: item.type,
                    timestamp: item.timestamp
                };
            });
            resolve(files);
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete a file
function deleteFile(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('DB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Clear all saved files
function clearAllFiles() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('DB not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Initialize when loaded
initDB().then(() => {
    console.log('IndexedDB ready');
}).catch(err => {
    console.error('IndexedDB failed:', err);
});