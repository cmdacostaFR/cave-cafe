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
            <div class="coffee-card" data-id="${cafe.id}">
                <div class="coffee-card-name">${escapeHtml(cafe.nom)}</div>
                <div class="coffee-card-origin">${escapeHtml(cafe.origine || 'Origine inconnue')}</div>
                <div class="coffee-card-badges">
                    <span class="badge badge-statut ${getStatutClass(cafe.currentStatut)}">${cafe.currentStatut}</span>
                    ${cafe.fermente ? '<span class="badge badge-fermente">Fermenté</span>' : ''}
                    ${cafe.score ? `<span class="badge badge-score">${cafe.score}</span>` : ''}
                </div>
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.coffee-card').forEach(card => {
            card.addEventListener('click', () => {
                showCafeDetail(card.dataset.id);
            });
        });
    }

    function getStatutClass(statut) {
        switch (statut) {
            case 'En stock': return 'stock';
            case 'Entamé': return 'entame';
            case 'Fini': return 'fini';
            default: return 'stock';
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
        `;
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
            container.innerHTML = `
                <div class="degustations-list">
                    ${cafe.degustations.map(deg => `
                        <div class="degustation-item">
                            <div class="degustation-date">${formatDateFull(new Date(deg.dateDegustation))}</div>
                            <pre class="degustation-preview">${escapeHtml(deg.texteGenere || 'Pas de détails')}</pre>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-primary btn-new-degustation">Nouvelle dégustation</button>
            `;
        }

        // Add click handler for new degustation button
        container.querySelector('.btn-new-degustation').addEventListener('click', () => {
            openDegustationForm(cafe.id);
        });
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

    function openDegustationForm(cafeId) {
        currentCafeId = cafeId;
        degustationFormData = {};

        // Reset form
        document.getElementById('input-nez').value = '';
        document.getElementById('input-commentaire').value = '';
        document.querySelectorAll('.rating-buttons button, .choice-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.rating-label').forEach(label => {
            label.textContent = '';
        });
        document.getElementById('preview-degustation').textContent = '';

        showView('degustation');
    }

    function updateRatingLabel(field, value) {
        const label = document.getElementById(`label-${field}`);
        if (label && RATING_LABELS[field]) {
            label.textContent = RATING_LABELS[field][value] || '';
        }
    }

    function updateDegustationPreview() {
        let preview = '';

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
            await CaveDB.createDegustation(currentCafeId, {
                ...degustationFormData,
                texteGenere: texteGenere
            });

            showToast('Dégustation enregistrée');
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
        loadCoffeeList
    };
})();
