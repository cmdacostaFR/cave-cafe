/**
 * Cave à Café - Markdown Parser Module
 * Parses Plaine Café .md files and tracking table .md files
 */

const CafeParser = (function() {

    /**
     * Parse a Plaine Café fiche .md file
     * @param {string} content - The markdown content
     * @param {string} filename - The filename (for fallback extraction)
     * @returns {Object} Parsed cafe data
     */
    function parseFicheCafe(content, filename = '') {
        const data = {
            nom: '',
            origine: '',
            region: '',
            terroir: '',
            process: '',
            altitude: '',
            espece: '',
            varietes: '',
            score: null,
            fermente: false,
            familleAromatique: '',
            intensite: '',
            saveurs: '',
            prixTTC: null,
            sourceURL: '',
            label: '',
            torrefaction: 'Moyenne'
        };

        try {
            // Extract frontmatter
            const frontmatter = extractFrontmatter(content);
            if (frontmatter.Titre) {
                data.nom = cleanTitle(frontmatter.Titre);
            }
            if (frontmatter.Source) {
                data.sourceURL = frontmatter.Source;
            }

            // If no title from frontmatter, try to extract from first ## heading
            if (!data.nom) {
                const headingMatch = content.match(/^##\s+(.+)$/m);
                if (headingMatch) {
                    data.nom = cleanTitle(headingMatch[1]);
                }
            }

            // If still no title, use filename
            if (!data.nom && filename) {
                data.nom = cleanFilename(filename);
            }

            // Extract characteristics section
            const characteristics = extractCharacteristics(content);
            
            if (characteristics.Origine) data.origine = characteristics.Origine;
            if (characteristics.Région || characteristics['Région']) data.region = characteristics.Région || characteristics['Région'];
            if (characteristics.Terroir) data.terroir = characteristics.Terroir;
            if (characteristics.Process || characteristics.Procédé || characteristics['Procédé'] || characteristics['Procédé(s)']) {
                data.process = characteristics.Process || characteristics.Procédé || characteristics['Procédé'] || characteristics['Procédé(s)'] || '';
            }
            if (characteristics['Altitude (m)'] || characteristics.Altitude) {
                data.altitude = characteristics['Altitude (m)'] || characteristics.Altitude || '';
            }
            if (characteristics.Espèce || characteristics['Espèce']) data.espece = characteristics.Espèce || characteristics['Espèce'];
            if (characteristics.Variétés || characteristics['Variétés']) data.varietes = characteristics.Variétés || characteristics['Variétés'];
            if (characteristics.Score) {
                const scoreNum = parseFloat(characteristics.Score);
                if (!isNaN(scoreNum)) data.score = scoreNum;
            }
            if (characteristics.Label) data.label = characteristics.Label;

            // Extract from fiche technique section
            const ficheTechnique = extractFicheTechnique(content);
            
            if (ficheTechnique.Origine && !data.origine) data.origine = ficheTechnique.Origine;
            if (ficheTechnique.Process && !data.process) data.process = ficheTechnique.Process;
            if (ficheTechnique.Score && !data.score) {
                const scoreNum = parseFloat(ficheTechnique.Score);
                if (!isNaN(scoreNum)) data.score = scoreNum;
            }
            if (ficheTechnique.Label && !data.label) data.label = ficheTechnique.Label;
            if (ficheTechnique['Famille aromatique']) data.familleAromatique = ficheTechnique['Famille aromatique'];
            if (ficheTechnique['Intensité du café']) {
                data.intensite = ficheTechnique['Intensité du café'];
                // Detect "Fermenté" in intensity
                if (data.intensite.toLowerCase().includes('ferment')) {
                    data.fermente = true;
                }
            }

            // Extract price
            const priceMatch = content.match(/(\d+[,\.]\d+)\s*€\s*TTC/i);
            if (priceMatch) {
                data.prixTTC = parseFloat(priceMatch[1].replace(',', '.'));
            }

            // Extract torréfaction
            if (content.toLowerCase().includes('torréfaction moyenne') || content.toLowerCase().includes('torrefaction moyenne')) {
                data.torrefaction = 'Moyenne';
            } else if (content.toLowerCase().includes('torréfaction faible') || content.toLowerCase().includes('torrefaction faible')) {
                data.torrefaction = 'Faible';
            } else if (content.toLowerCase().includes('torréfaction forte') || content.toLowerCase().includes('torrefaction forte')) {
                data.torrefaction = 'Forte';
            }

            // Extract saveurs/notes from description
            data.saveurs = extractSaveurs(content);

            // Additional fermenté detection
            if (!data.fermente) {
                // Check in content for fermenté indicators
                const fermentePatterns = [
                    /fermenté/i,
                    /fermentation/i,
                    /anaérobie/i,
                    /anaerobie/i
                ];
                for (const pattern of fermentePatterns) {
                    if (pattern.test(content)) {
                        // But not if it's just about natural fermentation process
                        if (!/fermentation\s+naturelle/i.test(content)) {
                            data.fermente = true;
                            break;
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error parsing fiche:', error);
        }

        return data;
    }

    /**
     * Extract YAML frontmatter
     */
    function extractFrontmatter(content) {
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) return {};

        const frontmatter = {};
        const lines = frontmatterMatch[1].split('\n');
        
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                // Remove quotes
                value = value.replace(/^["']|["']$/g, '');
                frontmatter[key] = value;
            }
        }

        return frontmatter;
    }

    /**
     * Extract characteristics from markdown structure
     * Handles patterns like:
     * Origine
     * 
     * Colombie
     */
    function extractCharacteristics(content) {
        const characteristics = {};
        
        // Pattern: Key followed by blank line(s) followed by value
        const keyValuePattern = /(Origine|Région|Terroir|Procédé(?:\(s\))?|Process|Altitude\s*\(m\)|Espèce|Variétés|Score|Type de récolte|Label)\s*\n+\s*([^\n]+)/gi;
        
        let match;
        while ((match = keyValuePattern.exec(content)) !== null) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Skip if value looks like another key or is an image
            if (!value.match(/^(Origine|Région|Terroir|Procédé|Process|Altitude|Espèce|Variétés|Score|!\[)/i)) {
                characteristics[key] = value;
            }
        }

        return characteristics;
    }

    /**
     * Extract fiche technique section
     * Handles patterns like:
     * - ### Origine
     *     Colombie
     */
    function extractFicheTechnique(content) {
        const ficheTechnique = {};
        
        // Find fiche technique section
        const ficheMatch = content.match(/##\s*Fiche technique\s*\n([\s\S]*?)(?=\n##\s|$)/i);
        if (!ficheMatch) return ficheTechnique;

        const ficheContent = ficheMatch[1];
        
        // Pattern: ### Key followed by value
        const pattern = /###\s+([^\n]+)\s*\n\s*([^\n#]+)/g;
        
        let match;
        while ((match = pattern.exec(ficheContent)) !== null) {
            const key = match[1].trim();
            const value = match[2].trim();
            ficheTechnique[key] = value;
        }

        // Also try list pattern: - ### Key\n\tValue
        const listPattern = /-\s*###\s+([^\n]+)\s*\n\s*([^\n-]+)/g;
        while ((match = listPattern.exec(ficheContent)) !== null) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (!ficheTechnique[key]) {
                ficheTechnique[key] = value;
            }
        }

        return ficheTechnique;
    }

    /**
     * Extract saveurs/notes de dégustation
     */
    function extractSaveurs(content) {
        const saveurs = [];

        // Try to find explicit note patterns
        const notePatterns = [
            /Notes?\s+(?:de\s+)?([^.\n]+)/gi,
            /notes?\s+vineuses?,?\s*(?:de\s+)?([^.\n]+)/gi
        ];

        for (const pattern of notePatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const note = match[1].trim();
                if (note && !saveurs.includes(note)) {
                    saveurs.push(note);
                }
            }
        }

        // If no notes found, try to extract from description sections
        if (saveurs.length === 0) {
            // Look for common flavor descriptors
            const flavorKeywords = [
                'fruits rouges', 'chocolat', 'cacao', 'noisette', 'caramel',
                'épices', 'poivre', 'tabac', 'foin', 'herbes', 'agrumes',
                'citron', 'pêche', 'muscade', 'praline', 'miel', 'vanille',
                'boisé', 'fumé', 'réglisse', 'thé noir', 'noix'
            ];
            
            const contentLower = content.toLowerCase();
            for (const flavor of flavorKeywords) {
                if (contentLower.includes(flavor)) {
                    saveurs.push(flavor);
                }
            }
        }

        return saveurs.slice(0, 5).join(', ');
    }

    /**
     * Clean title from frontmatter format
     */
    function cleanTitle(title) {
        // Remove pipes, website suffixes, and clean up
        return title
            .replace(/\s*[\|｜]\s*Torréfaction Plaine Café.*$/i, '')
            .replace(/\s*-\s*Plaine Café.*$/i, '')
            .trim();
    }

    /**
     * Clean filename to extract cafe name
     */
    function cleanFilename(filename) {
        return filename
            .replace(/\.md$/i, '')
            .replace(/\s*[\|｜]\s*Torréfaction Plaine Café.*$/i, '')
            .replace(/\s*-\s*Plaine Café.*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Parse a tracking table .md file (Suivi dégustations)
     * @param {string} content - The markdown content
     * @returns {Array} Array of parsed cafe data
     */
    function parseTableauSuivi(content) {
        const cafes = [];

        try {
            // Find markdown table
            const lines = content.split('\n');
            let headerLine = null;
            let headerIndex = -1;
            const dataLines = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('|') && line.includes('Nom du café')) {
                    headerLine = line;
                    headerIndex = i;
                } else if (headerLine && i > headerIndex + 1 && line.startsWith('|')) {
                    // Skip separator line
                    if (!line.match(/^\|\s*[-:]+/)) {
                        dataLines.push(line);
                    }
                }
            }

            if (!headerLine) {
                console.warn('No table header found');
                return cafes;
            }

            // Parse header columns
            const headers = parseTableRow(headerLine);
            const columnMap = mapTableColumns(headers);

            // Parse data rows
            for (const line of dataLines) {
                const cells = parseTableRow(line);
                if (cells.length === 0) continue;

                const cafe = {
                    nom: getCellValue(cells, columnMap.nom) || '',
                    origine: getCellValue(cells, columnMap.origine) || '',
                    region: '',
                    terroir: '',
                    process: getCellValue(cells, columnMap.process) || '',
                    altitude: '',
                    espece: '',
                    varietes: getCellValue(cells, columnMap.variete) || '',
                    score: parseScore(getCellValue(cells, columnMap.score)),
                    fermente: parseBoolean(getCellValue(cells, columnMap.fermente)),
                    familleAromatique: '',
                    intensite: '',
                    saveurs: getCellValue(cells, columnMap.saveurs) || '',
                    prixTTC: null,
                    sourceURL: '',
                    label: '',
                    torrefaction: getCellValue(cells, columnMap.torrefaction) || 'Moyenne'
                };

                // If appreciation exists, store it for creating a degustation
                const appreciation = getCellValue(cells, columnMap.appreciation);
                if (appreciation) {
                    cafe._appreciation = appreciation;
                }

                if (cafe.nom) {
                    cafes.push(cafe);
                }
            }
        } catch (error) {
            console.error('Error parsing tableau:', error);
        }

        return cafes;
    }

    /**
     * Parse a markdown table row into cells
     */
    function parseTableRow(row) {
        // Remove leading and trailing pipes
        let cleaned = row.trim();
        if (cleaned.startsWith('|')) cleaned = cleaned.substring(1);
        if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);

        // Split by pipe and clean each cell
        return cleaned.split('|').map(cell => {
            return cell
                .trim()
                .replace(/<br\s*\/?>/gi, ', ') // Replace <br> with comma
                .replace(/\s+/g, ' ');
        });
    }

    /**
     * Map table headers to column indices
     */
    function mapTableColumns(headers) {
        const map = {
            nom: -1,
            origine: -1,
            fermente: -1,
            saveurs: -1,
            variete: -1,
            process: -1,
            torrefaction: -1,
            score: -1,
            appreciation: -1
        };

        headers.forEach((header, index) => {
            const h = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            if (h.includes('nom') && h.includes('cafe')) map.nom = index;
            else if (h === 'nom') map.nom = index;
            else if (h.includes('origine')) map.origine = index;
            else if (h.includes('ferment')) map.fermente = index;
            else if (h.includes('saveur')) map.saveurs = index;
            else if (h.includes('variete')) map.variete = index;
            else if (h.includes('process')) map.process = index;
            else if (h.includes('torrefaction')) map.torrefaction = index;
            else if (h.includes('score')) map.score = index;
            else if (h.includes('appreciation') || h.includes('mon appreciation')) map.appreciation = index;
        });

        return map;
    }

    /**
     * Get cell value safely
     */
    function getCellValue(cells, index) {
        if (index < 0 || index >= cells.length) return null;
        const value = cells[index];
        return value === '-' || value === '' ? null : value;
    }

    /**
     * Parse score from string
     */
    function parseScore(value) {
        if (!value) return null;
        const num = parseFloat(value.replace(',', '.'));
        return isNaN(num) ? null : num;
    }

    /**
     * Parse boolean from French text
     */
    function parseBoolean(value) {
        if (!value) return false;
        const v = value.toLowerCase().trim();
        return v === 'oui' || v === 'yes' || v === 'true' || v === '1';
    }

    /**
     * Read file content as text
     * @param {File} file - The file object
     * @returns {Promise<string>} File content
     */
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Import multiple fiche files
     * @param {FileList} files - The file list
     * @param {Function} progressCallback - Progress callback (current, total)
     * @returns {Promise<Object>} Import result { imported, merged, errors }
     */
    async function importFiches(files, progressCallback) {
        const result = {
            imported: 0,
            merged: 0,
            errors: [],
            cafes: []
        };

        const total = files.length;
        let current = 0;

        for (const file of files) {
            try {
                current++;
                if (progressCallback) progressCallback(current, total);

                const content = await readFileAsText(file);
                const cafeData = parseFicheCafe(content, file.name);

                if (!cafeData.nom) {
                    result.errors.push(`${file.name}: Nom non trouvé`);
                    continue;
                }

                // Check if cafe already exists
                const existing = await CaveDB.findCafeByName(cafeData.nom);
                
                if (existing) {
                    // Merge: update existing with new data (keep user data like status)
                    const merged = { ...existing };
                    
                    // Only update fields that are empty in existing or have new data
                    if (!merged.sourceURL && cafeData.sourceURL) merged.sourceURL = cafeData.sourceURL;
                    if (!merged.prixTTC && cafeData.prixTTC) merged.prixTTC = cafeData.prixTTC;
                    if (!merged.region && cafeData.region) merged.region = cafeData.region;
                    if (!merged.terroir && cafeData.terroir) merged.terroir = cafeData.terroir;
                    if (!merged.altitude && cafeData.altitude) merged.altitude = cafeData.altitude;
                    if (!merged.espece && cafeData.espece) merged.espece = cafeData.espece;
                    if (!merged.varietes && cafeData.varietes) merged.varietes = cafeData.varietes;
                    if (!merged.score && cafeData.score) merged.score = cafeData.score;
                    if (!merged.label && cafeData.label) merged.label = cafeData.label;
                    if (!merged.saveurs && cafeData.saveurs) merged.saveurs = cafeData.saveurs;
                    if (!merged.familleAromatique && cafeData.familleAromatique) merged.familleAromatique = cafeData.familleAromatique;
                    if (!merged.intensite && cafeData.intensite) merged.intensite = cafeData.intensite;
                    if (cafeData.fermente) merged.fermente = true;

                    await CaveDB.updateCafe(merged);
                    result.merged++;
                    result.cafes.push(merged);
                } else {
                    // Create new cafe
                    const newCafe = await CaveDB.createCafe(cafeData);
                    result.imported++;
                    result.cafes.push(newCafe);
                }
            } catch (error) {
                result.errors.push(`${file.name}: ${error.message}`);
            }
        }

        return result;
    }

    /**
     * Import a tracking table file
     * @param {File} file - The file
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Import result
     */
    async function importTableau(file, progressCallback) {
        const result = {
            imported: 0,
            merged: 0,
            errors: [],
            cafes: []
        };

        try {
            const content = await readFileAsText(file);
            const cafesData = parseTableauSuivi(content);

            const total = cafesData.length;
            let current = 0;

            for (const cafeData of cafesData) {
                current++;
                if (progressCallback) progressCallback(current, total);

                try {
                    // Check if cafe already exists
                    const existing = await CaveDB.findCafeByName(cafeData.nom);

                    if (existing) {
                        // Merge data
                        const merged = { ...existing };
                        
                        if (!merged.origine && cafeData.origine) merged.origine = cafeData.origine;
                        if (!merged.process && cafeData.process) merged.process = cafeData.process;
                        if (!merged.varietes && cafeData.varietes) merged.varietes = cafeData.varietes;
                        if (!merged.score && cafeData.score) merged.score = cafeData.score;
                        if (!merged.saveurs && cafeData.saveurs) merged.saveurs = cafeData.saveurs;
                        if (!merged.torrefaction && cafeData.torrefaction) merged.torrefaction = cafeData.torrefaction;
                        if (cafeData.fermente) merged.fermente = true;

                        await CaveDB.updateCafe(merged);

                        // Create degustation from appreciation if exists
                        if (cafeData._appreciation) {
                            await CaveDB.createDegustation(existing.id, {
                                commentaire: cafeData._appreciation,
                                texteGenere: `Commentaire : ${cafeData._appreciation}`
                            });
                        }

                        result.merged++;
                        result.cafes.push(merged);
                    } else {
                        // Create new cafe
                        const newCafe = await CaveDB.createCafe(cafeData);

                        // Create degustation from appreciation if exists
                        if (cafeData._appreciation) {
                            await CaveDB.createDegustation(newCafe.id, {
                                commentaire: cafeData._appreciation,
                                texteGenere: `Commentaire : ${cafeData._appreciation}`
                            });
                        }

                        result.imported++;
                        result.cafes.push(newCafe);
                    }
                } catch (error) {
                    result.errors.push(`${cafeData.nom}: ${error.message}`);
                }
            }
        } catch (error) {
            result.errors.push(`Erreur fichier: ${error.message}`);
        }

        return result;
    }

    /**
     * Parse a Cave à Café backup export file (cave-cafe-export-*.md)
     * @param {string} content - The markdown content
     * @returns {Object} Parsed data { cafes: [], degustations: [] }
     */
    function parseBackupExport(content) {
        const result = {
            cafes: [],
            degustations: []
        };

        try {
            // Split by fiche sections (### Nom du café)
            const ficheSections = content.split(/\n### /).slice(1); // Skip header before first ###

            for (const section of ficheSections) {
                const lines = section.split('\n');
                const nom = lines[0].trim();
                
                if (!nom || nom.startsWith('Échelle') || nom.startsWith('Statuts')) {
                    continue; // Skip legend sections
                }

                const cafe = {
                    nom: nom,
                    origine: '',
                    region: '',
                    terroir: '',
                    process: '',
                    altitude: '',
                    espece: '',
                    varietes: '',
                    score: null,
                    fermente: false,
                    familleAromatique: '',
                    intensite: '',
                    saveurs: '',
                    prixTTC: null,
                    sourceURL: '',
                    label: '',
                    torrefaction: 'Moyenne',
                    status: 'En stock',
                    statusHistory: []
                };

                const sectionContent = section;

                // Parse informations générales
                const infoMatch = sectionContent.match(/\*\*Origine\*\*\s*:\s*([^\n]+)/);
                if (infoMatch) cafe.origine = infoMatch[1].trim();

                const regionMatch = sectionContent.match(/\*\*Région\*\*\s*:\s*([^\n]+)/);
                if (regionMatch) cafe.region = regionMatch[1].trim();

                const terroirMatch = sectionContent.match(/\*\*Terroir\*\*\s*:\s*([^\n]+)/);
                if (terroirMatch) cafe.terroir = terroirMatch[1].trim();

                const processMatch = sectionContent.match(/\*\*Process\*\*\s*:\s*([^\n]+)/);
                if (processMatch) cafe.process = processMatch[1].trim();

                const altitudeMatch = sectionContent.match(/\*\*Altitude\*\*\s*:\s*([^\n]+)/);
                if (altitudeMatch) cafe.altitude = altitudeMatch[1].trim();

                const especeMatch = sectionContent.match(/\*\*Espèce\*\*\s*:\s*([^\n]+)/);
                if (especeMatch) cafe.espece = especeMatch[1].trim();

                const varietesMatch = sectionContent.match(/\*\*Variétés\*\*\s*:\s*([^\n]+)/);
                if (varietesMatch) cafe.varietes = varietesMatch[1].trim();

                const scoreMatch = sectionContent.match(/\*\*Score\*\*\s*:\s*([0-9.,]+)/);
                if (scoreMatch) cafe.score = parseFloat(scoreMatch[1].replace(',', '.'));

                const fermenteMatch = sectionContent.match(/\*\*Fermenté\*\*\s*:\s*(Oui|Non)/i);
                if (fermenteMatch) cafe.fermente = fermenteMatch[1].toLowerCase() === 'oui';

                const familleMatch = sectionContent.match(/\*\*Famille aromatique\*\*\s*:\s*([^\n]+)/);
                if (familleMatch) cafe.familleAromatique = familleMatch[1].trim();

                const intensiteMatch = sectionContent.match(/\*\*Intensité\*\*\s*:\s*([^\n]+)/);
                if (intensiteMatch) cafe.intensite = intensiteMatch[1].trim();

                const saveursMatch = sectionContent.match(/\*\*Saveurs\*\*\s*:\s*([^\n]+)/);
                if (saveursMatch) cafe.saveurs = saveursMatch[1].trim();

                const torrefMatch = sectionContent.match(/\*\*Torréfaction\*\*\s*:\s*([^\n]+)/);
                if (torrefMatch) cafe.torrefaction = torrefMatch[1].trim();

                const labelMatch = sectionContent.match(/\*\*Label\*\*\s*:\s*([^\n]+)/);
                if (labelMatch) cafe.label = labelMatch[1].trim();

                const prixMatch = sectionContent.match(/\*\*Prix\*\*\s*:\s*([0-9.,]+)\s*€/);
                if (prixMatch) cafe.prixTTC = parseFloat(prixMatch[1].replace(',', '.'));

                const sourceMatch = sectionContent.match(/\*\*Source\*\*\s*:\s*\[Lien\]\(([^)]+)\)/);
                if (sourceMatch) cafe.sourceURL = sourceMatch[1].trim();

                // Parse status history
                const historySection = sectionContent.match(/\*\*Historique des statuts\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/);
                if (historySection) {
                    const historyLines = historySection[1].match(/-\s*(\d+\/\d+\/\d+)\s+(\d+:\d+)\s*:\s*([^\n]+)/g);
                    if (historyLines) {
                        for (const line of historyLines) {
                            const match = line.match(/-\s*(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)\s*:\s*(.+)/);
                            if (match) {
                                const [, day, month, year, hour, minute, status] = match;
                                const date = new Date(year, month - 1, day, hour, minute);
                                cafe.statusHistory.push({
                                    date: date.toISOString(),
                                    status: status.trim()
                                });
                                // Keep the last status as current
                                cafe.status = status.trim();
                            }
                        }
                    }
                }

                // Parse degustations
                const degustationMatches = sectionContent.matchAll(/####\s*Dégustation du (\d+)\s+(\w+)\s+(\d+)\s*\(([^)]+)\)\s*\n\s*```\s*\n([\s\S]*?)```/g);
                for (const degMatch of degustationMatches) {
                    const [, day, monthName, year, infusion, commentaire] = degMatch;
                    
                    const monthMap = {
                        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
                        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
                    };
                    const month = monthMap[monthName.toLowerCase()] || 0;
                    const date = new Date(parseInt(year), month, parseInt(day));

                    result.degustations.push({
                        cafeNom: nom,
                        date: date.toISOString(),
                        infusion: infusion.trim(),
                        texteGenere: commentaire.trim()
                    });
                }

                result.cafes.push(cafe);
            }
        } catch (error) {
            console.error('Error parsing backup export:', error);
        }

        return result;
    }

    /**
     * Import a Cave à Café backup export file
     * @param {File} file - The file
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Import result
     */
    async function importBackup(file, progressCallback) {
        const result = {
            imported: 0,
            merged: 0,
            degustationsImported: 0,
            errors: [],
            cafes: []
        };

        try {
            const content = await readFileAsText(file);
            
            // Check if this is a Cave à Café export
            if (!content.includes('# Cave à Café — Export')) {
                result.errors.push('Ce fichier ne semble pas être un export Cave à Café valide');
                return result;
            }

            const parsed = parseBackupExport(content);
            const total = parsed.cafes.length;
            let current = 0;

            for (const cafeData of parsed.cafes) {
                current++;
                if (progressCallback) progressCallback(current, total);

                try {
                    // Check if cafe already exists
                    const existing = await CaveDB.findCafeByName(cafeData.nom);

                    if (existing) {
                        // Merge data - update existing with backup data
                        const merged = { ...existing };
                        
                        // Update all fields from backup
                        if (cafeData.origine) merged.origine = cafeData.origine;
                        if (cafeData.region) merged.region = cafeData.region;
                        if (cafeData.terroir) merged.terroir = cafeData.terroir;
                        if (cafeData.process) merged.process = cafeData.process;
                        if (cafeData.altitude) merged.altitude = cafeData.altitude;
                        if (cafeData.espece) merged.espece = cafeData.espece;
                        if (cafeData.varietes) merged.varietes = cafeData.varietes;
                        if (cafeData.score) merged.score = cafeData.score;
                        if (cafeData.fermente) merged.fermente = cafeData.fermente;
                        if (cafeData.familleAromatique) merged.familleAromatique = cafeData.familleAromatique;
                        if (cafeData.intensite) merged.intensite = cafeData.intensite;
                        if (cafeData.saveurs) merged.saveurs = cafeData.saveurs;
                        if (cafeData.torrefaction) merged.torrefaction = cafeData.torrefaction;
                        if (cafeData.label) merged.label = cafeData.label;
                        if (cafeData.prixTTC) merged.prixTTC = cafeData.prixTTC;
                        if (cafeData.sourceURL) merged.sourceURL = cafeData.sourceURL;
                        if (cafeData.status) merged.status = cafeData.status;
                        if (cafeData.statusHistory && cafeData.statusHistory.length > 0) {
                            merged.statusHistory = cafeData.statusHistory;
                        }

                        await CaveDB.updateCafe(merged);
                        result.merged++;
                        result.cafes.push(merged);
                    } else {
                        // Create new cafe
                        const newCafe = await CaveDB.createCafe(cafeData);
                        result.imported++;
                        result.cafes.push(newCafe);
                    }
                } catch (error) {
                    result.errors.push(`${cafeData.nom}: ${error.message}`);
                }
            }

            // Import degustations
            for (const degData of parsed.degustations) {
                try {
                    // Find the cafe
                    const cafe = await CaveDB.findCafeByName(degData.cafeNom);
                    if (cafe) {
                        // Check if this degustation already exists (by date and cafe)
                        const existingDegs = await CaveDB.getDegustations(cafe.id);
                        const degDate = new Date(degData.date).toDateString();
                        const exists = existingDegs.some(d => 
                            new Date(d.date).toDateString() === degDate && 
                            d.infusion === degData.infusion
                        );

                        if (!exists) {
                            await CaveDB.createDegustation(cafe.id, {
                                date: degData.date,
                                infusion: degData.infusion,
                                texteGenere: degData.texteGenere
                            });
                            result.degustationsImported++;
                        }
                    }
                } catch (error) {
                    console.error('Error importing degustation:', error);
                }
            }

        } catch (error) {
            result.errors.push(`Erreur fichier: ${error.message}`);
        }

        return result;
    }

    // Public API
    return {
        parseFicheCafe,
        parseTableauSuivi,
        parseBackupExport,
        importFiches,
        importTableau,
        importBackup,
        readFileAsText
    };
})();
