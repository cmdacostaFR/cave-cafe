/**
 * Cave à Café - Main Application
 * Handles UI, navigation, and user interactions
 */

const CaveCafeApp = (function() {
    // Current state
    let currentView = 'list';
    let currentCafeId = null;
    let currentFilters = {
        statut: 'all',
        fermente: 'all',
        origine: 'all',
        scoreMin: 0,
        aRacheter: 'all'
    };
    let currentSort = 'nom-asc';
    let degustationFormData = {};
    
    // Admin mode state
    let isAdminMode = false;
    let selectedCafes = new Set();
    let confirmCallback = null;

    // Rating labels
    const RATING_LABELS = {
        acidite: ['', 'Très faible', 'Faible', 'Modérée', 'Élevée', 'Très élevée'],
        amertume: ['', 'Très faible', 'Faible', 'Modérée', 'Élevée', 'Très élevée'],
        corps: ['', 'Très léger', 'Léger', 'Moyen', 'Corsé', 'Très corsé'],
        longueurBouche: ['', 'Très courte', 'Courte', 'Moyenne', 'Longue', 'Très longue'],
        noteGlobale: ['', 'Médiocre', 'Passable', 'Bon', 'Excellent', 'Exceptionnel']
    };

    /**
     * Initialize the application
     */
    async function init() {
        try {
            await CaveDB.init();
            setupEventListeners();
            await loadCoffeeList();
            await updateStats();
            console.log('Cave à Café initialized');
        } catch (error) {
            console.error('Failed to initialize:', error);
            showToast('Erreur d\'initialisation', 'error');
        }
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Navigation
        document.getElementById('btn-back').addEventListener('click', goBack);
        document.getElementById('btn-filter').addEventListener('click', () => showView('filters'));
        document.getElementById('btn-settings').addEventListener('click', () => showView('settings'));

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Import/Export
        document.getElementById('btn-import-fiches').addEventListener('click', () => {
            document.getElementById('input-import-fiches').click();
        });
        document.getElementById('input-import-fiches').addEventListener('change', handleImportFiches);

        document.getElementById('btn-import-tableau').addEventListener('click', () => {
            document.getElementById('input-import-tableau').click();
        });
        document.getElementById('input-import-tableau').addEventListener('change', handleImportTableau);

        document.getElementById('btn-import-backup').addEventListener('click', () => {
            document.getElementById('input-import-backup').click();
        });
        document.getElementById('input-import-backup').addEventListener('change', handleImportBackup);

        document.getElementById('btn-export').addEventListener('click', handleExport);
        document.getElementById('btn-import-empty').addEventListener('click', () => showView('settings'));

        // Filters
        document.getElementById('btn-apply-filters').addEventListener('click', applyFilters);
        document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);

        // Filter chips
        document.querySelectorAll('.filter-chips-select').forEach(container => {
            container.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                });
            });
        });

        // Score range
        document.getElementById('filter-score').addEventListener('input', (e) => {
            document.getElementById('filter-score-value').textContent = e.target.value;
        });

        // Degustation form
        document.querySelectorAll('.rating-buttons').forEach(container => {
            const field = container.dataset.field;
            container.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    degustationFormData[field] = parseInt(btn.dataset.value);
                    updateRatingLabel(field, parseInt(btn.dataset.value));
                    updateDegustationPreview();
                });
            });
        });

        document.querySelectorAll('.choice-buttons').forEach(container => {
            const field = container.dataset.field;
            container.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    degustationFormData[field] = btn.dataset.value;
                    updateDegustationPreview();
                });
            });
        });

        // Infusion buttons
        document.querySelectorAll('.infusion-buttons').forEach(container => {
            container.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    degustationFormData.infusion = btn.dataset.value;
                    updateDegustationPreview();
                });
            });
        });

        document.getElementById('input-nez').addEventListener('input', (e) => {
            degustationFormData.auNez = e.target.value;
            updateDegustationPreview();
        });

        document.getElementById('input-commentaire').addEventListener('input', (e) => {
            degustationFormData.commentaire = e.target.value;
            updateDegustationPreview();
        });

        document.getElementById('btn-cancel-degustation').addEventListener('click', goBack);
        document.getElementById('form-degustation').addEventListener('submit', handleSaveDegustation);

        // Modal
        document.getElementById('btn-close-result').addEventListener('click', closeResultModal);

        // Admin mode
        document.getElementById('toggle-admin').addEventListener('change', toggleAdminMode);
        document.getElementById('btn-delete-selected').addEventListener('click', deleteSelectedCafes);
        document.getElementById('btn-clear-all').addEventListener('click', clearAllData);
        document.getElementById('btn-scan-duplicates').addEventListener('click', scanDuplicates);
        document.getElementById('btn-new-cafe').addEventListener('click', () => openCafeEditor());

        // Cafe editor
        document.getElementById('btn-cancel-edit-cafe').addEventListener('click', goBack);
        document.getElementById('form-edit-cafe').addEventListener('submit', handleSaveCafe);

        // Confirm modal
        document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirmModal);
        document.getElementById('btn-confirm-ok').addEventListener('click', executeConfirmAction);
    }

    // ========================================
    // VIEW MANAGEMENT
    // ========================================

    function showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });

        // Show target view
        const view = document.getElementById(`view-${viewName}`);
        if (view) {
            view.classList.remove('hidden');
            view.classList.add('active');
        }

        // Update header
        const backBtn = document.getElementById('btn-back');
        const title = document.getElementById('header-title');

        if (viewName === 'list') {
            backBtn.classList.add('hidden');
            title.textContent = 'Cave à Café';
        } else {
            backBtn.classList.remove('hidden');
            switch (viewName) {
                case 'detail':
                    title.textContent = 'Détail';
                    break;
                case 'degustation':
                    title.textContent = 'Nouvelle dégustation';
                    break;
                case 'edit-cafe':
                    title.textContent = document.getElementById('edit-cafe-id').value ? 'Modifier le café' : 'Nouveau café';
                    break;
                case 'filters':
                    title.textContent = 'Filtres & Tri';
                    break;
                case 'settings':
                    title.textContent = 'Paramètres';
                    updateStats();
                    break;
            }
        }

        currentView = viewName;
    }

    function goBack() {
        if (currentView === 'degustation') {
            showCafeDetail(currentCafeId);
        } else if (currentView === 'edit-cafe') {
            if (currentCafeId) {
                showCafeDetail(currentCafeId);
            } else {
                showView('settings');
            }
        } else {
            showView('list');
            loadCoffeeList();
        }
    }

    // ========================================
    // COFFEE LIST
    // ========================================

    async function loadCoffeeList() {
        try {
            let cafes = await CaveDB.getAllCafesWithStatus();

            // Apply filters
            cafes = applyFiltersToList(cafes);

            // Apply sort
            cafes = applySortToList(cafes);

            // Render
            renderCoffeeGrid(cafes);
            renderActiveFilters();
            updateResultsCount(cafes.length);
        } catch (error) {
            console.error('Error loading coffee list:', error);
            showToast('Erreur de chargement', 'error');
        }
    }

    function applyFiltersToList(cafes) {
        return cafes.filter(cafe => {
            // Statut filter
            if (currentFilters.statut !== 'all' && cafe.currentStatut !== currentFilters.statut) {
                return false;
            }

            // Fermenté filter
            if (currentFilters.fermente !== 'all') {
                const isF = currentFilters.fermente === 'true';
                if (cafe.fermente !== isF) return false;
            }

            // Origine filter
            if (currentFilters.origine !== 'all' && cafe.origine !== currentFilters.origine) {
                return false;
            }

            // Score filter
            if (currentFilters.scoreMin > 0 && (!cafe.score || cafe.score < currentFilters.scoreMin)) {
                return false;
            }

            // À racheter filter
            if (currentFilters.aRacheter !== 'all') {
                if (!cafe.latestDegustation || cafe.latestDegustation.aRacheter !== 'Oui') {
                    return false;
                }
            }

            return true;
        });
    }

    function applySortToList(cafes) {
        const [field, direction] = currentSort.split('-');
        const mult = direction === 'asc' ? 1 : -1;

        return cafes.sort((a, b) => {
            switch (field) {
                case 'nom':
                    return mult * a.nom.localeCompare(b.nom, 'fr');
                case 'score':
                    const scoreA = a.score || 0;
                    const scoreB = b.score || 0;
                    return mult * (scoreA - scoreB);
                case 'date':
                    return mult * (new Date(a.dateCrea) - new Date(b.dateCrea));
                case 'degustation':
                    const dateA = a.latestDegustation ? new Date(a.latestDegustation.dateDegustation) : new Date(0);
                    const dateB = b.latestDegustation ? new Date(b.latestDegustation.dateDegustation) : new Date(0);
                    return mult * (dateA - dateB);
                default:
                    return 0;
            }
        });
    }

    function renderCoffeeGrid(cafes) {
        const grid = document.getElementById('coffee-grid');
        const emptyState = document.getElementById('empty-state');

        if (cafes.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        grid.innerHTML = cafes.map(cafe => `
            <div class="coffee-card ${isAdminMode ? 'admin-mode' : ''} ${selectedCafes.has(cafe.id) ? 'selected' : ''}" data-id="${cafe.id}">
                ${isAdminMode ? `
                    <div class="coffee-card-admin-bar">
                        <label class="admin-checkbox" onclick="event.stopPropagation()">
                            <input type="checkbox" class="admin-select-cb" data-id="${cafe.id}" ${selectedCafes.has(cafe.id) ? 'checked' : ''}>
                            <span>Sélectionner</span>
                        </label>
                        <button class="btn-admin-open" data-id="${cafe.id}" onclick="event.stopPropagation()">Ouvrir</button>
                    </div>
                ` : ''}
                <div class="coffee-card-name">${escapeHtml(cafe.nom)}</div>
                <div class="coffee-card-origin">${escapeHtml(cafe.origine || 'Origine inconnue')}</div>
                <div class="coffee-card-pills">
                    ${getTorrefactionPill(cafe.torrefaction)}
                    ${cafe.label && cafe.label.toLowerCase().includes('bio') ? '<span class="pill pill-bio">Bio</span>' : ''}
                    ${cafe.decafeine || (cafe.process && cafe.process.toLowerCase().includes('décaféiné')) ? '<span class="pill pill-deca">Déca</span>' : ''}
                    ${cafe.fermente ? '<span class="pill pill-fermente">Fermenté</span>' : ''}
                </div>
                <div class="coffee-card-badges">
                    <span class="badge badge-statut ${getStatutClass(cafe.currentStatut)}">${cafe.currentStatut}</span>
                    ${cafe.score ? `<span class="badge badge-score">${cafe.score}</span>` : ''}
                </div>
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.coffee-card').forEach(card => {
            card.addEventListener('click', () => {
                if (!isAdminMode) {
                    showCafeDetail(card.dataset.id);
                }
                // En mode admin, le clic sur la carte ouvre aussi le détail
                // La sélection se fait via la checkbox
            });
        });

        // Admin mode: checkbox handlers
        if (isAdminMode) {
            grid.querySelectorAll('.admin-select-cb').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    toggleCafeSelection(e.target.dataset.id);
                });
            });
            grid.querySelectorAll('.btn-admin-open').forEach(btn => {
                btn.addEventListener('click', () => {
                    showCafeDetail(btn.dataset.id);
                });
            });
        }
    }

    function getStatutClass(statut) {
        switch (statut) {
            case 'En stock': return 'stock';
            case 'Entamé': return 'entame';
            case 'Fini': return 'fini';
            default: return 'stock';
        }
    }

    function getTorrefactionPill(torrefaction) {
        if (!torrefaction) return '<span class="pill pill-torref pill-tm">TM</span>';
        switch (torrefaction) {
            case 'Faible': return '<span class="pill pill-torref pill-tl">TL</span>';
            case 'Forte': return '<span class="pill pill-torref pill-tf">TF</span>';
            case 'Moyenne':
            default: return '<span class="pill pill-torref pill-tm">TM</span>';
        }
    }

    function updateResultsCount(count) {
        document.getElementById('results-count').textContent = 
            count === 1 ? '1 café' : `${count} cafés`;
    }

    function renderActiveFilters() {
        const container = document.getElementById('active-filters');
        const chips = [];

        if (currentFilters.statut !== 'all') {
            chips.push({ label: currentFilters.statut, filter: 'statut' });
        }
        if (currentFilters.fermente !== 'all') {
            chips.push({ label: currentFilters.fermente === 'true' ? 'Fermenté' : 'Non fermenté', filter: 'fermente' });
        }
        if (currentFilters.origine !== 'all') {
            chips.push({ label: currentFilters.origine, filter: 'origine' });
        }
        if (currentFilters.scoreMin > 0) {
            chips.push({ label: `Score ≥ ${currentFilters.scoreMin}`, filter: 'scoreMin' });
        }
        if (currentFilters.aRacheter !== 'all') {
            chips.push({ label: 'À racheter', filter: 'aRacheter' });
        }

        container.innerHTML = chips.map(chip => `
            <div class="filter-chip">
                ${escapeHtml(chip.label)}
                <button data-filter="${chip.filter}">×</button>
            </div>
        `).join('');

        // Add remove handlers
        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filter = btn.dataset.filter;
                if (filter === 'scoreMin') {
                    currentFilters[filter] = 0;
                } else {
                    currentFilters[filter] = 'all';
                }
                loadCoffeeList();
            });
        });
    }

    // ========================================
    // FILTERS
    // ========================================

    async function applyFilters() {
        // Read filter values
        currentFilters.statut = getSelectedChipValue('filter-statut');
        currentFilters.fermente = getSelectedChipValue('filter-fermente');
        currentFilters.origine = document.getElementById('filter-origine').value;
        currentFilters.scoreMin = parseInt(document.getElementById('filter-score').value) || 0;
        currentFilters.aRacheter = getSelectedChipValue('filter-racheter');
        currentSort = document.getElementById('sort-by').value;

        showView('list');
        await loadCoffeeList();
    }

    function resetFilters() {
        currentFilters = {
            statut: 'all',
            fermente: 'all',
            origine: 'all',
            scoreMin: 0,
            aRacheter: 'all'
        };
        currentSort = 'nom-asc';

        // Reset UI
        resetChips('filter-statut', 'all');
        resetChips('filter-fermente', 'all');
        resetChips('filter-racheter', 'all');
        document.getElementById('filter-origine').value = 'all';
        document.getElementById('filter-score').value = 0;
        document.getElementById('filter-score-value').textContent = '0';
        document.getElementById('sort-by').value = 'nom-asc';

        showToast('Filtres réinitialisés');
    }

    function getSelectedChipValue(containerId) {
        const container = document.getElementById(containerId);
        const active = container.querySelector('.chip.active');
        return active ? active.dataset.value : 'all';
    }

    function resetChips(containerId, defaultValue) {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.value === defaultValue);
        });
    }

    async function updateOrigineOptions() {
        const stats = await CaveDB.getStats();
        const select = document.getElementById('filter-origine');
        
        select.innerHTML = '<option value="all">Toutes</option>' +
            stats.origines.sort().map(o => 
                `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`
            ).join('');
    }

    // ========================================
    // CAFE DETAIL
    // ========================================

    async function showCafeDetail(cafeId) {
        try {
            currentCafeId = cafeId;
            const cafe = await CaveDB.getCafeComplete(cafeId);
            if (!cafe) {
                showToast('Café non trouvé', 'error');
                return;
            }

            renderDetailHeader(cafe);
            renderTabInfo(cafe);
            renderTabStatut(cafe);
            renderTabDegustations(cafe);

            showView('detail');
            switchTab('info');
        } catch (error) {
            console.error('Error loading cafe detail:', error);
            showToast('Erreur de chargement', 'error');
        }
    }

    function renderDetailHeader(cafe) {
        document.getElementById('detail-header').innerHTML = `
            <h2>${escapeHtml(cafe.nom)}</h2>
            <div class="detail-header-meta">
                <span>${escapeHtml(cafe.origine || 'Origine inconnue')}</span>
                ${cafe.score ? `<span>Score: ${cafe.score}</span>` : ''}
                ${cafe.fermente ? '<span class="badge badge-fermente">Fermenté</span>' : ''}
            </div>
        `;
    }

    function renderTabInfo(cafe) {
        const infos = [
            { label: 'Origine', value: cafe.origine },
            { label: 'Région', value: cafe.region },
            { label: 'Terroir', value: cafe.terroir },
            { label: 'Process', value: cafe.process },
            { label: 'Altitude', value: cafe.altitude },
            { label: 'Espèce', value: cafe.espece },
            { label: 'Variétés', value: cafe.varietes },
            { label: 'Score', value: cafe.score },
            { label: 'Famille aromatique', value: cafe.familleAromatique },
            { label: 'Intensité', value: cafe.intensite },
            { label: 'Saveurs', value: cafe.saveurs },
            { label: 'Torréfaction', value: cafe.torrefaction },
            { label: 'Label', value: cafe.label },
            { label: 'Prix', value: cafe.prixTTC ? `${cafe.prixTTC.toFixed(2)} €` : null }
        ].filter(item => item.value);

        document.getElementById('tab-info').innerHTML = `
            <div class="info-grid">
                ${infos.map(info => `
                    <div class="info-item">
                        <span class="info-label">${info.label}</span>
                        <span class="info-value">${escapeHtml(String(info.value))}</span>
                    </div>
                `).join('')}
                ${cafe.sourceURL ? `
                    <div class="info-item">
                        <span class="info-label">Source</span>
                        <span class="info-value"><a href="${escapeHtml(cafe.sourceURL)}" target="_blank">Voir la fiche</a></span>
                    </div>
                ` : ''}
            </div>
            ${isAdminMode ? `
                <button class="btn-primary btn-edit-cafe-info" id="btn-edit-current-cafe">
                    Modifier cette fiche
                </button>
                <button class="btn-secondary btn-duplicate-cafe" id="btn-duplicate-current-cafe">
                    Dupliquer cette fiche
                </button>
                <button class="btn-danger btn-delete-cafe" id="btn-delete-current-cafe">
                    Supprimer ce café
                </button>
            ` : ''}
        `;

        // Add admin handlers
        if (isAdminMode) {
            document.getElementById('btn-edit-current-cafe').addEventListener('click', () => {
                openCafeEditor(cafe);
            });
            document.getElementById('btn-duplicate-current-cafe').addEventListener('click', () => {
                duplicateCafe(cafe);
            });
            document.getElementById('btn-delete-current-cafe').addEventListener('click', () => {
                deleteSingleCafe(cafe.id, cafe.nom);
            });
        }
    }

    function renderTabStatut(cafe) {
        const container = document.getElementById('tab-statut');
        
        container.innerHTML = `
            <div class="statut-buttons">
                <button class="statut-btn stock ${cafe.currentStatut === 'En stock' ? 'active' : ''}" data-statut="En stock">En stock</button>
                <button class="statut-btn entame ${cafe.currentStatut === 'Entamé' ? 'active' : ''}" data-statut="Entamé">Entamé</button>
                <button class="statut-btn fini ${cafe.currentStatut === 'Fini' ? 'active' : ''}" data-statut="Fini">Fini</button>
            </div>
            <h4 class="historique-title">Historique</h4>
            <ul class="historique-list">
                ${cafe.historique.map(h => `
                    <li class="historique-item">
                        <span class="historique-date">${formatDateTime(new Date(h.dateChangement))}</span>
                        <span class="historique-statut">${h.statut}</span>
                    </li>
                `).join('')}
            </ul>
        `;

        // Add click handlers for status buttons
        container.querySelectorAll('.statut-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const newStatut = btn.dataset.statut;
                if (newStatut !== cafe.currentStatut) {
                    await changeStatut(cafe.id, newStatut);
                    // Refresh the detail view
                    showCafeDetail(cafe.id);
                    showToast(`Statut changé: ${newStatut}`);
                }
            });
        });
    }

    async function changeStatut(cafeId, newStatut) {
        await CaveDB.createStatut(cafeId, newStatut);
    }

    function renderTabDegustations(cafe) {
        const container = document.getElementById('tab-degustations');

        if (cafe.degustations.length === 0) {
            container.innerHTML = `
                <p class="no-degustations">Aucune dégustation enregistrée</p>
                <button class="btn-primary btn-new-degustation">Nouvelle dégustation</button>
            `;
        } else {
            // Generate summary
            const summary = generateDegustationSummary(cafe.degustations);
            
            container.innerHTML = `
                ${summary}
                <div class="degustations-list">
                    ${cafe.degustations.map(deg => `
                        <div class="degustation-item" data-id="${deg.id}">
                            <div class="degustation-header">
                                <div class="degustation-meta">
                                    ${deg.infusion ? `<span class="degustation-infusion">${deg.infusion}</span>` : ''}
                                    <span class="degustation-date">${formatDateFull(new Date(deg.dateDegustation))}</span>
                                </div>
                                ${isAdminMode ? `
                                    <div class="degustation-actions">
                                        <button class="btn-edit-degustation" data-id="${deg.id}" title="Modifier">✎</button>
                                        <button class="btn-delete-degustation" data-id="${deg.id}" title="Supprimer">×</button>
                                    </div>
                                ` : ''}
                            </div>
                            <pre class="degustation-preview">${escapeHtml(deg.texteGenere || 'Pas de détails')}</pre>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-primary btn-new-degustation">Nouvelle dégustation</button>
            `;

            // Add admin action handlers
            if (isAdminMode) {
                container.querySelectorAll('.btn-edit-degustation').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        editDegustation(btn.dataset.id);
                    });
                });
                container.querySelectorAll('.btn-delete-degustation').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteDegustationConfirm(btn.dataset.id, cafe.id);
                    });
                });
            }
        }

        // Add click handler for new degustation button
        container.querySelector('.btn-new-degustation').addEventListener('click', () => {
            openDegustationForm(cafe.id);
        });
    }

    function generateDegustationSummary(degustations) {
        if (degustations.length === 0) return '';

        // Calculate averages
        let aciditeSum = 0, aciditeCount = 0;
        let amertumeSum = 0, amertumeCount = 0;
        let corpsSum = 0, corpsCount = 0;
        let longueurSum = 0, longueurCount = 0;
        let noteSum = 0, noteCount = 0;
        let aRacheterOui = 0;
        const infusions = {};

        degustations.forEach(deg => {
            if (deg.acidite) { aciditeSum += deg.acidite; aciditeCount++; }
            if (deg.amertume) { amertumeSum += deg.amertume; amertumeCount++; }
            if (deg.corps) { corpsSum += deg.corps; corpsCount++; }
            if (deg.longueurBouche) { longueurSum += deg.longueurBouche; longueurCount++; }
            if (deg.noteGlobale) { noteSum += deg.noteGlobale; noteCount++; }
            if (deg.aRacheter === 'Oui') aRacheterOui++;
            if (deg.infusion) {
                infusions[deg.infusion] = (infusions[deg.infusion] || 0) + 1;
            }
        });

        const avgAcidite = aciditeCount > 0 ? (aciditeSum / aciditeCount).toFixed(1) : '-';
        const avgAmertume = amertumeCount > 0 ? (amertumeSum / amertumeCount).toFixed(1) : '-';
        const avgCorps = corpsCount > 0 ? (corpsSum / corpsCount).toFixed(1) : '-';
        const avgLongueur = longueurCount > 0 ? (longueurSum / longueurCount).toFixed(1) : '-';
        const avgNote = noteCount > 0 ? (noteSum / noteCount).toFixed(1) : '-';

        const infusionsList = Object.entries(infusions)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name} (${count})`)
            .join(', ');

        return `
            <div class="degustations-summary">
                <div class="summary-title">Synthèse (${degustations.length} dégustation${degustations.length > 1 ? 's' : ''})</div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-item-label">Acidité</span>
                        <div class="summary-bar">
                            <div class="summary-bar-fill"><div class="summary-bar-fill-inner" style="width: ${avgAcidite !== '-' ? (parseFloat(avgAcidite) / 5 * 100) : 0}%"></div></div>
                            <span class="summary-bar-value">${avgAcidite}/5</span>
                        </div>
                    </div>
                    <div class="summary-item">
                        <span class="summary-item-label">Amertume</span>
                        <div class="summary-bar">
                            <div class="summary-bar-fill"><div class="summary-bar-fill-inner" style="width: ${avgAmertume !== '-' ? (parseFloat(avgAmertume) / 5 * 100) : 0}%"></div></div>
                            <span class="summary-bar-value">${avgAmertume}/5</span>
                        </div>
                    </div>
                    <div class="summary-item">
                        <span class="summary-item-label">Corps</span>
                        <div class="summary-bar">
                            <div class="summary-bar-fill"><div class="summary-bar-fill-inner" style="width: ${avgCorps !== '-' ? (parseFloat(avgCorps) / 5 * 100) : 0}%"></div></div>
                            <span class="summary-bar-value">${avgCorps}/5</span>
                        </div>
                    </div>
                    <div class="summary-item">
                        <span class="summary-item-label">Longueur</span>
                        <div class="summary-bar">
                            <div class="summary-bar-fill"><div class="summary-bar-fill-inner" style="width: ${avgLongueur !== '-' ? (parseFloat(avgLongueur) / 5 * 100) : 0}%"></div></div>
                            <span class="summary-bar-value">${avgLongueur}/5</span>
                        </div>
                    </div>
                </div>
                <div class="summary-grid" style="margin-top: var(--spacing-sm);">
                    <div class="summary-item">
                        <span class="summary-item-label">Note moyenne</span>
                        <span class="summary-item-value">${avgNote}/5</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-item-label">À racheter</span>
                        <span class="summary-item-value">${aRacheterOui}/${degustations.length}</span>
                    </div>
                </div>
                ${infusionsList ? `
                    <div class="summary-item" style="margin-top: var(--spacing-sm);">
                        <span class="summary-item-label">Infusions testées</span>
                        <span class="summary-item-value">${infusionsList}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabName}`);
            panel.classList.toggle('hidden', panel.id !== `tab-${tabName}`);
        });
    }

    // ========================================
    // DEGUSTATION FORM
    // ========================================

    let editingDegustationId = null;

    function openDegustationForm(cafeId, existingDegustation = null) {
        currentCafeId = cafeId;
        editingDegustationId = existingDegustation ? existingDegustation.id : null;
        degustationFormData = {};

        // Reset form
        document.getElementById('input-degustation-id').value = editingDegustationId || '';
        document.getElementById('input-nez').value = '';
        document.getElementById('input-commentaire').value = '';
        
        // Reset all buttons
        document.querySelectorAll('.rating-buttons button, .choice-buttons button, .infusion-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.rating-label').forEach(label => {
            label.textContent = '';
        });
        document.getElementById('preview-degustation').textContent = '';

        // Set default infusion to Moka
        const mokaBtn = document.querySelector('.infusion-buttons button[data-value="Moka"]');
        if (mokaBtn) {
            mokaBtn.classList.add('active');
            degustationFormData.infusion = 'Moka';
        }

        // If editing, populate form with existing data
        if (existingDegustation) {
            degustationFormData = { ...existingDegustation };
            
            document.getElementById('input-nez').value = existingDegustation.auNez || '';
            document.getElementById('input-commentaire').value = existingDegustation.commentaire || '';
            
            // Set infusion
            if (existingDegustation.infusion) {
                document.querySelectorAll('.infusion-buttons button').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === existingDegustation.infusion);
                });
            }

            // Set ratings
            ['acidite', 'amertume', 'corps', 'longueurBouche', 'noteGlobale'].forEach(field => {
                if (existingDegustation[field]) {
                    const container = document.querySelector(`.rating-buttons[data-field="${field}"]`);
                    if (container) {
                        const btn = container.querySelector(`button[data-value="${existingDegustation[field]}"]`);
                        if (btn) btn.classList.add('active');
                        updateRatingLabel(field, existingDegustation[field]);
                    }
                }
            });

            // Set aRacheter
            if (existingDegustation.aRacheter) {
                const container = document.querySelector('.choice-buttons[data-field="aRacheter"]');
                if (container) {
                    const btn = container.querySelector(`button[data-value="${existingDegustation.aRacheter}"]`);
                    if (btn) btn.classList.add('active');
                }
            }

            updateDegustationPreview();
            
            // Update button text
            document.getElementById('btn-save-degustation').textContent = 'Mettre à jour';
        } else {
            document.getElementById('btn-save-degustation').textContent = 'Enregistrer';
        }

        showView('degustation');
    }

    async function editDegustation(degustationId) {
        try {
            const degustation = await CaveDB.getDegustation(degustationId);
            if (degustation) {
                openDegustationForm(degustation.cafeId, degustation);
            }
        } catch (error) {
            console.error('Error loading degustation:', error);
            showToast('Erreur de chargement', 'error');
        }
    }

    function deleteDegustationConfirm(degustationId, cafeId) {
        showConfirmModal(
            'Supprimer cette dégustation',
            'Êtes-vous sûr de vouloir supprimer cette dégustation ? Cette action est irréversible.',
            async () => {
                try {
                    await CaveDB.deleteDegustation(degustationId);
                    showToast('Dégustation supprimée', 'success');
                    showCafeDetail(cafeId);
                } catch (error) {
                    console.error('Error deleting degustation:', error);
                    showToast('Erreur de suppression', 'error');
                }
            }
        );
    }

    function updateRatingLabel(field, value) {
        const label = document.getElementById(`label-${field}`);
        if (label && RATING_LABELS[field]) {
            label.textContent = RATING_LABELS[field][value] || '';
        }
    }

    function updateDegustationPreview() {
        let preview = '';

        if (degustationFormData.infusion) {
            preview += `Infusion : ${degustationFormData.infusion}\n`;
        }

        if (degustationFormData.auNez) {
            preview += `Au nez : ${degustationFormData.auNez}\n`;
        }

        preview += 'En bouche :\n';
        
        if (degustationFormData.acidite) {
            preview += `  acidité : ${RATING_LABELS.acidite[degustationFormData.acidite].toLowerCase()} (${degustationFormData.acidite}/5)\n`;
        }
        if (degustationFormData.amertume) {
            preview += `  amertume : ${RATING_LABELS.amertume[degustationFormData.amertume].toLowerCase()} (${degustationFormData.amertume}/5)\n`;
        }
        if (degustationFormData.corps) {
            preview += `  le corps : ${RATING_LABELS.corps[degustationFormData.corps].toLowerCase()} (${degustationFormData.corps}/5)\n`;
        }
        if (degustationFormData.longueurBouche) {
            preview += `  la longueur en bouche : ${RATING_LABELS.longueurBouche[degustationFormData.longueurBouche].toLowerCase()} (${degustationFormData.longueurBouche}/5)\n`;
        }

        if (degustationFormData.aRacheter) {
            preview += `à racheter : ${degustationFormData.aRacheter}\n`;
        }

        if (degustationFormData.noteGlobale) {
            preview += `Appréciation globale : ${RATING_LABELS.noteGlobale[degustationFormData.noteGlobale].toLowerCase()} (${degustationFormData.noteGlobale}/5)\n`;
        }

        if (degustationFormData.commentaire) {
            preview += `Commentaire : ${degustationFormData.commentaire}`;
        }

        document.getElementById('preview-degustation').textContent = preview;
        return preview;
    }

    async function handleSaveDegustation(e) {
        e.preventDefault();

        const texteGenere = updateDegustationPreview();

        try {
            if (editingDegustationId) {
                // Update existing degustation
                const existing = await CaveDB.getDegustation(editingDegustationId);
                const updated = {
                    ...existing,
                    ...degustationFormData,
                    texteGenere: texteGenere
                };
                await CaveDB.updateDegustation(updated);
                showToast('Dégustation mise à jour');
            } else {
                // Create new degustation
                await CaveDB.createDegustation(currentCafeId, {
                    ...degustationFormData,
                    texteGenere: texteGenere
                });
                showToast('Dégustation enregistrée');
            }
            
            editingDegustationId = null;
            showCafeDetail(currentCafeId);
        } catch (error) {
            console.error('Error saving degustation:', error);
            showToast('Erreur d\'enregistrement', 'error');
        }
    }

    // ========================================
    // IMPORT
    // ========================================

    async function handleImportFiches(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        showProgressModal('Import en cours...');

        try {
            const result = await CafeParser.importFiches(files, (current, total) => {
                updateProgressModal(`${current}/${total} fichiers`, (current / total) * 100);
            });

            hideProgressModal();
            showResultModal('Import terminé', `
                <p class="success">${result.imported} café(s) importé(s)</p>
                <p class="warning">${result.merged} café(s) fusionné(s)</p>
                ${result.errors.length > 0 ? `<p class="error">${result.errors.length} erreur(s)</p>` : ''}
            `);

            await loadCoffeeList();
            await updateStats();
            await updateOrigineOptions();
        } catch (error) {
            hideProgressModal();
            showToast('Erreur d\'import', 'error');
            console.error('Import error:', error);
        }

        // Reset input
        e.target.value = '';
    }

    async function handleImportTableau(e) {
        const file = e.target.files[0];
        if (!file) return;

        showProgressModal('Import en cours...');

        try {
            const result = await CafeParser.importTableau(file, (current, total) => {
                updateProgressModal(`${current}/${total} cafés`, (current / total) * 100);
            });

            hideProgressModal();
            showResultModal('Import terminé', `
                <p class="success">${result.imported} café(s) importé(s)</p>
                <p class="warning">${result.merged} café(s) fusionné(s)</p>
                ${result.errors.length > 0 ? `<p class="error">${result.errors.length} erreur(s)</p>` : ''}
            `);

            await loadCoffeeList();
            await updateStats();
            await updateOrigineOptions();
        } catch (error) {
            hideProgressModal();
            showToast('Erreur d\'import', 'error');
            console.error('Import error:', error);
        }

        // Reset input
        e.target.value = '';
    }

    async function handleImportBackup(e) {
        const file = e.target.files[0];
        if (!file) return;

        showProgressModal('Restauration en cours...');

        try {
            const result = await CafeParser.importBackup(file, (current, total) => {
                updateProgressModal(`${current}/${total} cafés`, (current / total) * 100);
            });

            hideProgressModal();

            if (result.errors.length > 0 && result.imported === 0 && result.merged === 0) {
                showResultModal('Erreur de restauration', `
                    <p class="error">${result.errors[0]}</p>
                `);
            } else {
                showResultModal('Restauration terminée', `
                    <p class="success">${result.imported} café(s) restauré(s)</p>
                    <p class="warning">${result.merged} café(s) fusionné(s)</p>
                    <p class="info">${result.degustationsImported} dégustation(s) restaurée(s)</p>
                    ${result.errors.length > 0 ? `<p class="error">${result.errors.length} erreur(s)</p>` : ''}
                `);
            }

            await loadCoffeeList();
            await updateStats();
            await updateOrigineOptions();
        } catch (error) {
            hideProgressModal();
            showToast('Erreur de restauration', 'error');
            console.error('Import backup error:', error);
        }

        // Reset input
        e.target.value = '';
    }

    // ========================================
    // EXPORT
    // ========================================

    async function handleExport() {
        try {
            const filename = await CafeExporter.downloadExport();
            showToast(`Export: ${filename}`);
        } catch (error) {
            console.error('Export error:', error);
            showToast('Erreur d\'export', 'error');
        }
    }

    // ========================================
    // STATS
    // ========================================

    async function updateStats() {
        try {
            const stats = await CaveDB.getStats();
            
            document.getElementById('stat-total').textContent = stats.total;
            document.getElementById('stat-stock').textContent = stats.enStock;
            document.getElementById('stat-entame').textContent = stats.entame;
            document.getElementById('stat-fini').textContent = stats.fini;

            await updateOrigineOptions();
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // ========================================
    // MODALS
    // ========================================

    function showProgressModal(title) {
        document.getElementById('progress-text').textContent = title;
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('modal-progress').classList.remove('hidden');
    }

    function updateProgressModal(text, percent) {
        document.getElementById('progress-text').textContent = text;
        document.getElementById('progress-fill').style.width = `${percent}%`;
    }

    function hideProgressModal() {
        document.getElementById('modal-progress').classList.add('hidden');
    }

    function showResultModal(title, content) {
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-content').innerHTML = content;
        document.getElementById('modal-result').classList.remove('hidden');
    }

    function closeResultModal() {
        document.getElementById('modal-result').classList.add('hidden');
    }

    // ========================================
    // TOAST
    // ========================================

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // ========================================
    // UTILITIES
    // ========================================

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDateTime(date) {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDateFull(date) {
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // ========================================
    // ADMIN MODE
    // ========================================

    function toggleAdminMode() {
        isAdminMode = document.getElementById('toggle-admin').checked;
        const adminSection = document.getElementById('admin-section');
        const adminStatus = document.getElementById('admin-status');

        if (isAdminMode) {
            adminSection.classList.remove('hidden');
            adminStatus.textContent = 'Activé';
            adminStatus.style.color = 'var(--color-error)';
            selectedCafes.clear();
            showToast('Mode admin activé', 'warning');
        } else {
            adminSection.classList.add('hidden');
            adminStatus.textContent = 'Désactivé';
            adminStatus.style.color = '';
            selectedCafes.clear();
        }

        // Refresh the list to show/hide checkboxes
        loadCoffeeList();
        updateDeleteButtonCount();
    }

    function toggleCafeSelection(cafeId) {
        if (selectedCafes.has(cafeId)) {
            selectedCafes.delete(cafeId);
        } else {
            selectedCafes.add(cafeId);
        }

        // Update card visual
        const card = document.querySelector(`.coffee-card[data-id="${cafeId}"]`);
        if (card) {
            card.classList.toggle('selected', selectedCafes.has(cafeId));
        }

        updateDeleteButtonCount();
    }

    function updateDeleteButtonCount() {
        const btn = document.getElementById('btn-delete-selected');
        const count = selectedCafes.size;
        btn.textContent = `Supprimer la sélection (${count})`;
        btn.disabled = count === 0;
    }

    function deleteSelectedCafes() {
        if (selectedCafes.size === 0) return;

        const count = selectedCafes.size;
        showConfirmModal(
            'Supprimer les cafés sélectionnés',
            `Êtes-vous sûr de vouloir supprimer ${count} café(s) ? Cette action est irréversible.`,
            async () => {
                try {
                    for (const cafeId of selectedCafes) {
                        await CaveDB.deleteCafe(cafeId);
                    }
                    selectedCafes.clear();
                    updateDeleteButtonCount();
                    await loadCoffeeList();
                    await updateStats();
                    showToast(`${count} café(s) supprimé(s)`, 'success');
                } catch (error) {
                    console.error('Delete error:', error);
                    showToast('Erreur lors de la suppression', 'error');
                }
            }
        );
    }

    function deleteSingleCafe(cafeId, cafeName) {
        showConfirmModal(
            'Supprimer ce café',
            `Êtes-vous sûr de vouloir supprimer "${cafeName}" ? Cette action supprimera également l'historique des statuts et les dégustations associées.`,
            async () => {
                try {
                    await CaveDB.deleteCafe(cafeId);
                    showToast('Café supprimé', 'success');
                    showView('list');
                    await loadCoffeeList();
                    await updateStats();
                } catch (error) {
                    console.error('Delete error:', error);
                    showToast('Erreur lors de la suppression', 'error');
                }
            }
        );
    }

    function clearAllData() {
        showConfirmModal(
            'Supprimer TOUTES les données',
            'Êtes-vous ABSOLUMENT sûr ? Cette action supprimera TOUS vos cafés, dégustations et historiques. Cette action est IRRÉVERSIBLE.',
            async () => {
                try {
                    await CaveDB.clearAll();
                    selectedCafes.clear();
                    updateDeleteButtonCount();
                    await loadCoffeeList();
                    await updateStats();
                    showToast('Base de données réinitialisée', 'success');
                } catch (error) {
                    console.error('Clear error:', error);
                    showToast('Erreur lors de la réinitialisation', 'error');
                }
            }
        );
    }

    async function scanDuplicates() {
        try {
            const cafes = await CaveDB.getAllCafes();
            const duplicates = findDuplicates(cafes);
            renderDuplicatesList(duplicates);
        } catch (error) {
            console.error('Scan error:', error);
            showToast('Erreur lors de la recherche', 'error');
        }
    }

    function findDuplicates(cafes) {
        const groups = {};

        // Normalize names for comparison
        cafes.forEach(cafe => {
            const normalized = normalizeName(cafe.nom);
            if (!groups[normalized]) {
                groups[normalized] = [];
            }
            groups[normalized].push(cafe);
        });

        // Filter to only groups with 2+ cafes
        const duplicates = {};
        for (const key in groups) {
            if (groups[key].length > 1) {
                duplicates[key] = groups[key];
            }
        }

        return duplicates;
    }

    function normalizeName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
            .trim();
    }

    function renderDuplicatesList(duplicates) {
        const container = document.getElementById('duplicates-list');
        const keys = Object.keys(duplicates);

        if (keys.length === 0) {
            container.innerHTML = '<p class="text-muted">Aucun doublon détecté</p>';
            return;
        }

        container.innerHTML = keys.map(key => {
            const cafes = duplicates[key];
            return `
                <div class="duplicate-group">
                    <div class="duplicate-group-title">${cafes.length} entrées similaires :</div>
                    ${cafes.map(cafe => `
                        <div class="duplicate-item">
                            <span class="duplicate-item-name">${escapeHtml(cafe.nom)}</span>
                            <button class="duplicate-item-delete" data-id="${cafe.id}" data-name="${escapeHtml(cafe.nom)}">×</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

        // Add delete handlers
        container.querySelectorAll('.duplicate-item-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteSingleCafe(btn.dataset.id, btn.dataset.name);
            });
        });

        showToast(`${keys.length} groupe(s) de doublons trouvé(s)`, 'warning');
    }

    // ========================================
    // CAFE EDITOR (Create / Edit / Duplicate)
    // ========================================

    function openCafeEditor(existingCafe = null, isDuplicate = false) {
        // Reset form
        document.getElementById('form-edit-cafe').reset();
        
        if (existingCafe && !isDuplicate) {
            // Edit mode - keep the ID
            document.getElementById('edit-cafe-id').value = existingCafe.id;
            currentCafeId = existingCafe.id;
            document.getElementById('btn-save-cafe').textContent = 'Mettre à jour';
        } else if (existingCafe && isDuplicate) {
            // Duplicate mode - no ID, it's a new cafe
            document.getElementById('edit-cafe-id').value = '';
            currentCafeId = null;
            document.getElementById('btn-save-cafe').textContent = 'Créer le café';
        } else {
            // New cafe mode
            document.getElementById('edit-cafe-id').value = '';
            currentCafeId = null;
            document.getElementById('btn-save-cafe').textContent = 'Créer le café';
        }

        // Fill form with existing data if available
        if (existingCafe) {
            document.getElementById('edit-cafe-nom').value = isDuplicate 
                ? existingCafe.nom + ' (copie)' 
                : existingCafe.nom || '';
            document.getElementById('edit-cafe-origine').value = existingCafe.origine || '';
            document.getElementById('edit-cafe-region').value = existingCafe.region || '';
            document.getElementById('edit-cafe-terroir').value = existingCafe.terroir || '';
            document.getElementById('edit-cafe-altitude').value = existingCafe.altitude || '';
            document.getElementById('edit-cafe-process').value = existingCafe.process || '';
            document.getElementById('edit-cafe-score').value = existingCafe.score || '';
            document.getElementById('edit-cafe-espece').value = existingCafe.espece || '';
            document.getElementById('edit-cafe-varietes').value = existingCafe.varietes || '';
            document.getElementById('edit-cafe-fermente').checked = existingCafe.fermente || false;
            document.getElementById('edit-cafe-decafeine').checked = existingCafe.decafeine || false;
            document.getElementById('edit-cafe-saveurs').value = existingCafe.saveurs || '';
            document.getElementById('edit-cafe-famille').value = existingCafe.familleAromatique || '';
            document.getElementById('edit-cafe-intensite').value = existingCafe.intensite || '';
            document.getElementById('edit-cafe-torrefaction').value = existingCafe.torrefaction || 'Moyenne';
            document.getElementById('edit-cafe-prix').value = existingCafe.prixTTC || '';
            document.getElementById('edit-cafe-label').value = existingCafe.label || '';
            document.getElementById('edit-cafe-source').value = isDuplicate ? '' : (existingCafe.sourceURL || '');
        }

        showView('edit-cafe');
    }

    function duplicateCafe(cafe) {
        openCafeEditor(cafe, true);
    }

    async function handleSaveCafe(e) {
        e.preventDefault();

        const cafeId = document.getElementById('edit-cafe-id').value;
        const isEdit = !!cafeId;

        // Collect form data
        const cafeData = {
            nom: document.getElementById('edit-cafe-nom').value.trim(),
            origine: document.getElementById('edit-cafe-origine').value.trim(),
            region: document.getElementById('edit-cafe-region').value.trim(),
            terroir: document.getElementById('edit-cafe-terroir').value.trim(),
            altitude: document.getElementById('edit-cafe-altitude').value.trim(),
            process: document.getElementById('edit-cafe-process').value.trim(),
            score: document.getElementById('edit-cafe-score').value ? parseFloat(document.getElementById('edit-cafe-score').value) : null,
            espece: document.getElementById('edit-cafe-espece').value.trim(),
            varietes: document.getElementById('edit-cafe-varietes').value.trim(),
            fermente: document.getElementById('edit-cafe-fermente').checked,
            decafeine: document.getElementById('edit-cafe-decafeine').checked,
            saveurs: document.getElementById('edit-cafe-saveurs').value.trim(),
            familleAromatique: document.getElementById('edit-cafe-famille').value.trim(),
            intensite: document.getElementById('edit-cafe-intensite').value.trim(),
            torrefaction: document.getElementById('edit-cafe-torrefaction').value,
            prixTTC: document.getElementById('edit-cafe-prix').value ? parseFloat(document.getElementById('edit-cafe-prix').value) : null,
            label: document.getElementById('edit-cafe-label').value.trim(),
            sourceURL: document.getElementById('edit-cafe-source').value.trim()
        };

        // Validation
        if (!cafeData.nom) {
            showToast('Le nom du café est obligatoire', 'error');
            return;
        }

        try {
            if (isEdit) {
                // Update existing cafe
                const existingCafe = await CaveDB.getCafe(cafeId);
                const updatedCafe = { ...existingCafe, ...cafeData };
                await CaveDB.updateCafe(updatedCafe);
                showToast('Café mis à jour', 'success');
                showCafeDetail(cafeId);
            } else {
                // Create new cafe
                const newCafe = await CaveDB.createCafe(cafeData);
                showToast('Café créé', 'success');
                await loadCoffeeList();
                await updateStats();
                showCafeDetail(newCafe.id);
            }
        } catch (error) {
            console.error('Save cafe error:', error);
            showToast('Erreur lors de l\'enregistrement', 'error');
        }
    }

    // ========================================
    // CONFIRM MODAL
    // ========================================

    function showConfirmModal(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        confirmCallback = callback;
        document.getElementById('modal-confirm').classList.remove('hidden');
    }

    function closeConfirmModal() {
        document.getElementById('modal-confirm').classList.add('hidden');
        confirmCallback = null;
    }

    async function executeConfirmAction() {
        if (confirmCallback) {
            await confirmCallback();
        }
        closeConfirmModal();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        showView,
        loadCoffeeList,
        toggleAdminMode
    };
})();
