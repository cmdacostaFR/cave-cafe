/**
 * Cave à Café - IndexedDB Module
 * Handles all database operations for cafes, statuts, and degustations
 */

const CaveDB = (function() {
    const DB_NAME = 'CaveCafeDB';
    const DB_VERSION = 1;
    let db = null;

    // Store names
    const STORES = {
        CAFES: 'cafes',
        STATUTS: 'statuts',
        DEGUSTATIONS: 'degustations'
    };

    /**
     * Generate a UUID v4
     */
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Initialize the database
     */
    function init() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database opened successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Create cafes store
                if (!database.objectStoreNames.contains(STORES.CAFES)) {
                    const cafeStore = database.createObjectStore(STORES.CAFES, { keyPath: 'id' });
                    cafeStore.createIndex('nom', 'nom', { unique: false });
                    cafeStore.createIndex('origine', 'origine', { unique: false });
                    cafeStore.createIndex('fermente', 'fermente', { unique: false });
                    cafeStore.createIndex('score', 'score', { unique: false });
                    cafeStore.createIndex('dateCrea', 'dateCrea', { unique: false });
                }

                // Create statuts store (historique)
                if (!database.objectStoreNames.contains(STORES.STATUTS)) {
                    const statutStore = database.createObjectStore(STORES.STATUTS, { keyPath: 'id' });
                    statutStore.createIndex('cafeId', 'cafeId', { unique: false });
                    statutStore.createIndex('dateChangement', 'dateChangement', { unique: false });
                }

                // Create degustations store
                if (!database.objectStoreNames.contains(STORES.DEGUSTATIONS)) {
                    const degustStore = database.createObjectStore(STORES.DEGUSTATIONS, { keyPath: 'id' });
                    degustStore.createIndex('cafeId', 'cafeId', { unique: false });
                    degustStore.createIndex('dateDegustation', 'dateDegustation', { unique: false });
                }

                console.log('Database schema created/upgraded');
            };
        });
    }

    /**
     * Get a transaction and store
     */
    function getStore(storeName, mode = 'readonly') {
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // ========================================
    // CAFES CRUD
    // ========================================

    /**
     * Create a new cafe
     */
    function createCafe(cafeData) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.CAFES, 'readwrite');
            const now = new Date().toISOString();

            const cafe = {
                id: generateId(),
                nom: cafeData.nom || '',
                origine: cafeData.origine || '',
                region: cafeData.region || '',
                terroir: cafeData.terroir || '',
                process: cafeData.process || '',
                altitude: cafeData.altitude || '',
                espece: cafeData.espece || '',
                varietes: cafeData.varietes || '',
                score: cafeData.score !== undefined ? cafeData.score : null,
                fermente: cafeData.fermente || false,
                familleAromatique: cafeData.familleAromatique || '',
                intensite: cafeData.intensite || '',
                saveurs: cafeData.saveurs || '',
                prixTTC: cafeData.prixTTC || null,
                sourceURL: cafeData.sourceURL || '',
                label: cafeData.label || '',
                torrefaction: cafeData.torrefaction || 'Moyenne',
                dateCrea: now,
                dateModif: now
            };

            const request = store.add(cafe);
            
            request.onsuccess = () => {
                // Create initial status "En stock"
                createStatut(cafe.id, 'En stock').then(() => {
                    resolve(cafe);
                }).catch(reject);
            };
            
            request.onerror = () => reject(new Error('Failed to create cafe'));
        });
    }

    /**
     * Get a cafe by ID
     */
    function getCafe(id) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.CAFES);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get cafe'));
        });
    }

    /**
     * Get all cafes
     */
    function getAllCafes() {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.CAFES);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get cafes'));
        });
    }

    /**
     * Update a cafe
     */
    function updateCafe(cafe) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.CAFES, 'readwrite');
            cafe.dateModif = new Date().toISOString();
            
            const request = store.put(cafe);
            
            request.onsuccess = () => resolve(cafe);
            request.onerror = () => reject(new Error('Failed to update cafe'));
        });
    }

    /**
     * Delete a cafe and all related data
     */
    function deleteCafe(id) {
        return new Promise(async (resolve, reject) => {
            try {
                // Delete related statuts
                const statuts = await getStatutsByCafe(id);
                for (const statut of statuts) {
                    await deleteStatut(statut.id);
                }

                // Delete related degustations
                const degustations = await getDegustationsByCafe(id);
                for (const degustation of degustations) {
                    await deleteDegustation(degustation.id);
                }

                // Delete cafe
                const store = getStore(STORES.CAFES, 'readwrite');
                const request = store.delete(id);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error('Failed to delete cafe'));
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Find cafe by name (for fusion/merge)
     */
    function findCafeByName(nom) {
        return new Promise((resolve, reject) => {
            getAllCafes().then(cafes => {
                // Normalize name for comparison
                const normalizedSearch = normalizeName(nom);
                const found = cafes.find(c => normalizeName(c.nom) === normalizedSearch);
                resolve(found || null);
            }).catch(reject);
        });
    }

    /**
     * Normalize name for comparison
     */
    function normalizeName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
            .trim();
    }

    // ========================================
    // STATUTS CRUD
    // ========================================

    /**
     * Create a status entry
     */
    function createStatut(cafeId, statut, note = '') {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.STATUTS, 'readwrite');
            
            const statutEntry = {
                id: generateId(),
                cafeId: cafeId,
                statut: statut, // 'En stock', 'Entamé', 'Fini'
                dateChangement: new Date().toISOString(),
                note: note
            };

            const request = store.add(statutEntry);
            
            request.onsuccess = () => resolve(statutEntry);
            request.onerror = () => reject(new Error('Failed to create statut'));
        });
    }

    /**
     * Get all statuts for a cafe
     */
    function getStatutsByCafe(cafeId) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.STATUTS);
            const index = store.index('cafeId');
            const request = index.getAll(cafeId);
            
            request.onsuccess = () => {
                const statuts = request.result || [];
                // Sort by date ascending
                statuts.sort((a, b) => new Date(a.dateChangement) - new Date(b.dateChangement));
                resolve(statuts);
            };
            request.onerror = () => reject(new Error('Failed to get statuts'));
        });
    }

    /**
     * Get current status for a cafe
     */
    function getCurrentStatut(cafeId) {
        return new Promise((resolve, reject) => {
            getStatutsByCafe(cafeId).then(statuts => {
                if (statuts.length === 0) {
                    resolve({ statut: 'En stock', dateChangement: null });
                } else {
                    resolve(statuts[statuts.length - 1]);
                }
            }).catch(reject);
        });
    }

    /**
     * Delete a statut
     */
    function deleteStatut(id) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.STATUTS, 'readwrite');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete statut'));
        });
    }

    /**
     * Get all statuts (for export)
     */
    function getAllStatuts() {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.STATUTS);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get all statuts'));
        });
    }

    // ========================================
    // DEGUSTATIONS CRUD
    // ========================================

    /**
     * Create a degustation
     */
    function createDegustation(cafeId, degustationData) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.DEGUSTATIONS, 'readwrite');
            
            const degustation = {
                id: generateId(),
                cafeId: cafeId,
                dateDegustation: new Date().toISOString(),
                infusion: degustationData.infusion || 'Moka',
                acidite: degustationData.acidite || null,
                amertume: degustationData.amertume || null,
                corps: degustationData.corps || null,
                longueurBouche: degustationData.longueurBouche || null,
                noteGlobale: degustationData.noteGlobale || null,
                auNez: degustationData.auNez || '',
                aRacheter: degustationData.aRacheter || '',
                commentaire: degustationData.commentaire || '',
                texteGenere: degustationData.texteGenere || ''
            };

            const request = store.add(degustation);
            
            request.onsuccess = () => resolve(degustation);
            request.onerror = () => reject(new Error('Failed to create degustation'));
        });
    }

    /**
     * Update a degustation
     */
    function updateDegustation(degustation) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.DEGUSTATIONS, 'readwrite');
            
            const request = store.put(degustation);
            
            request.onsuccess = () => resolve(degustation);
            request.onerror = () => reject(new Error('Failed to update degustation'));
        });
    }

    /**
     * Get a degustation by ID
     */
    function getDegustation(id) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.DEGUSTATIONS);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get degustation'));
        });
    }

    /**
     * Get all degustations for a cafe
     */
    function getDegustationsByCafe(cafeId) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.DEGUSTATIONS);
            const index = store.index('cafeId');
            const request = index.getAll(cafeId);
            
            request.onsuccess = () => {
                const degustations = request.result || [];
                // Sort by date descending (most recent first)
                degustations.sort((a, b) => new Date(b.dateDegustation) - new Date(a.dateDegustation));
                resolve(degustations);
            };
            request.onerror = () => reject(new Error('Failed to get degustations'));
        });
    }

    /**
     * Get latest degustation for a cafe
     */
    function getLatestDegustation(cafeId) {
        return new Promise((resolve, reject) => {
            getDegustationsByCafe(cafeId).then(degustations => {
                resolve(degustations[0] || null);
            }).catch(reject);
        });
    }

    /**
     * Delete a degustation
     */
    function deleteDegustation(id) {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.DEGUSTATIONS, 'readwrite');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete degustation'));
        });
    }

    /**
     * Get all degustations (for export)
     */
    function getAllDegustations() {
        return new Promise((resolve, reject) => {
            const store = getStore(STORES.DEGUSTATIONS);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get all degustations'));
        });
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Get complete data for a cafe (with current status and latest degustation)
     */
    async function getCafeComplete(id) {
        const cafe = await getCafe(id);
        if (!cafe) return null;

        const currentStatut = await getCurrentStatut(id);
        const degustations = await getDegustationsByCafe(id);
        const statuts = await getStatutsByCafe(id);

        return {
            ...cafe,
            currentStatut: currentStatut.statut,
            statutDate: currentStatut.dateChangement,
            degustations: degustations,
            historique: statuts
        };
    }

    /**
     * Get all cafes with their current status
     */
    async function getAllCafesWithStatus() {
        const cafes = await getAllCafes();
        const result = [];

        for (const cafe of cafes) {
            const currentStatut = await getCurrentStatut(cafe.id);
            const latestDegustation = await getLatestDegustation(cafe.id);
            
            result.push({
                ...cafe,
                currentStatut: currentStatut.statut,
                statutDate: currentStatut.dateChangement,
                latestDegustation: latestDegustation
            });
        }

        return result;
    }

    /**
     * Get statistics
     */
    async function getStats() {
        const cafes = await getAllCafesWithStatus();
        
        return {
            total: cafes.length,
            enStock: cafes.filter(c => c.currentStatut === 'En stock').length,
            entame: cafes.filter(c => c.currentStatut === 'Entamé').length,
            fini: cafes.filter(c => c.currentStatut === 'Fini').length,
            fermente: cafes.filter(c => c.fermente).length,
            origines: [...new Set(cafes.map(c => c.origine).filter(o => o))]
        };
    }

    /**
     * Clear all data (for testing)
     */
    function clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.CAFES, STORES.STATUTS, STORES.DEGUSTATIONS], 'readwrite');
            
            transaction.objectStore(STORES.CAFES).clear();
            transaction.objectStore(STORES.STATUTS).clear();
            transaction.objectStore(STORES.DEGUSTATIONS).clear();
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('Failed to clear database'));
        });
    }

    /**
     * Export all data for backup
     */
    async function exportAllData() {
        const cafes = await getAllCafes();
        const statuts = await getAllStatuts();
        const degustations = await getAllDegustations();

        return {
            version: DB_VERSION,
            exportDate: new Date().toISOString(),
            cafes: cafes,
            statuts: statuts,
            degustations: degustations
        };
    }

    // Public API
    return {
        init,
        generateId,
        // Cafes
        createCafe,
        getCafe,
        getAllCafes,
        updateCafe,
        deleteCafe,
        findCafeByName,
        getCafeComplete,
        getAllCafesWithStatus,
        // Statuts
        createStatut,
        getStatutsByCafe,
        getCurrentStatut,
        // Degustations
        createDegustation,
        updateDegustation,
        getDegustation,
        getDegustationsByCafe,
        getLatestDegustation,
        deleteDegustation,
        // Utility
        getStats,
        clearAll,
        exportAllData
    };
})();
