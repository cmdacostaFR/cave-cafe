/**
 * Cave à Café - Markdown Exporter Module
 * Generates .md export files with table + detailed fiches
 */

const CafeExporter = (function() {

    /**
     * Generate complete export markdown
     * @returns {Promise<string>} Markdown content
     */
    async function generateExport() {
        const data = await CaveDB.exportAllData();
        const cafes = data.cafes;
        const statuts = data.statuts;
        const degustations = data.degustations;

        // Build cafe map with statuts and degustations
        const cafeMap = {};
        for (const cafe of cafes) {
            cafeMap[cafe.id] = {
                ...cafe,
                statuts: [],
                degustations: [],
                currentStatut: 'En stock'
            };
        }

        // Add statuts
        for (const statut of statuts) {
            if (cafeMap[statut.cafeId]) {
                cafeMap[statut.cafeId].statuts.push(statut);
            }
        }

        // Sort statuts and get current
        for (const id in cafeMap) {
            const cafe = cafeMap[id];
            cafe.statuts.sort((a, b) => new Date(a.dateChangement) - new Date(b.dateChangement));
            if (cafe.statuts.length > 0) {
                cafe.currentStatut = cafe.statuts[cafe.statuts.length - 1].statut;
            }
        }

        // Add degustations
        for (const degustation of degustations) {
            if (cafeMap[degustation.cafeId]) {
                cafeMap[degustation.cafeId].degustations.push(degustation);
            }
        }

        // Sort degustations (most recent first)
        for (const id in cafeMap) {
            cafeMap[id].degustations.sort((a, b) => 
                new Date(b.dateDegustation) - new Date(a.dateDegustation)
            );
        }

        // Convert to array and sort by name
        const cafesArray = Object.values(cafeMap);
        cafesArray.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

        // Generate markdown
        let md = '';

        // Header
        md += `# Cave à Café — Export du ${formatDateISO(new Date())}\n\n`;
        md += `> Exporté le ${formatDateFull(new Date())}\n`;
        md += `> ${cafes.length} café(s) dans la collection\n\n`;

        // Table récapitulatif
        md += `## Tableau récapitulatif\n\n`;
        md += generateTable(cafesArray);
        md += '\n\n';

        // Fiches détaillées
        md += `## Fiches détaillées\n\n`;
        for (const cafe of cafesArray) {
            md += generateFiche(cafe);
            md += '\n---\n\n';
        }

        // Légende
        md += generateLegend();

        return md;
    }

    /**
     * Generate the summary table
     */
    function generateTable(cafes) {
        let table = '| Nom | Origine | Statut | Fermenté | Process | Score | Dernière dégustation | Note | À racheter |\n';
        table += '|-----|---------|--------|----------|---------|-------|---------------------|------|------------|\n';

        for (const cafe of cafes) {
            const latestDeg = cafe.degustations[0];
            
            const row = [
                escapeTableCell(cafe.nom || '-'),
                escapeTableCell(cafe.origine || '-'),
                escapeTableCell(cafe.currentStatut || '-'),
                cafe.fermente ? 'Oui' : 'Non',
                escapeTableCell(cafe.process || '-'),
                cafe.score ? cafe.score.toString() : '-',
                latestDeg ? formatDateShort(new Date(latestDeg.dateDegustation)) : '-',
                latestDeg && latestDeg.noteGlobale ? `${latestDeg.noteGlobale}/5` : '-',
                latestDeg ? (latestDeg.aRacheter || '-') : '-'
            ];

            table += '| ' + row.join(' | ') + ' |\n';
        }

        return table;
    }

    /**
     * Generate a detailed fiche for one cafe
     */
    function generateFiche(cafe) {
        let fiche = '';

        // Header
        fiche += `### ${cafe.nom}\n\n`;

        // Informations générales
        fiche += `**Informations générales**\n\n`;
        
        const infos = [
            ['Origine', cafe.origine],
            ['Région', cafe.region],
            ['Terroir', cafe.terroir],
            ['Process', cafe.process],
            ['Altitude', cafe.altitude],
            ['Espèce', cafe.espece],
            ['Variétés', cafe.varietes],
            ['Score', cafe.score],
            ['Fermenté', cafe.fermente ? 'Oui' : 'Non'],
            ['Famille aromatique', cafe.familleAromatique],
            ['Intensité', cafe.intensite],
            ['Saveurs', cafe.saveurs],
            ['Torréfaction', cafe.torrefaction],
            ['Label', cafe.label],
            ['Prix', cafe.prixTTC ? `${cafe.prixTTC.toFixed(2)} €` : null]
        ];

        for (const [label, value] of infos) {
            if (value) {
                fiche += `- **${label}** : ${value}\n`;
            }
        }

        if (cafe.sourceURL) {
            fiche += `- **Source** : [Lien](${cafe.sourceURL})\n`;
        }

        fiche += '\n';

        // Historique des statuts
        if (cafe.statuts && cafe.statuts.length > 0) {
            fiche += `**Historique des statuts**\n\n`;
            for (const statut of cafe.statuts) {
                const date = formatDateTime(new Date(statut.dateChangement));
                fiche += `- ${date} : ${statut.statut}`;
                if (statut.note) {
                    fiche += ` _(${statut.note})_`;
                }
                fiche += '\n';
            }
            fiche += '\n';
        }

        // Dégustations
        if (cafe.degustations && cafe.degustations.length > 0) {
            fiche += `**Dégustations**\n\n`;
            for (const deg of cafe.degustations) {
                const date = formatDateFull(new Date(deg.dateDegustation));
                const infusion = deg.infusion ? ` (${deg.infusion})` : '';
                fiche += `#### Dégustation du ${date}${infusion}\n\n`;
                
                if (deg.texteGenere) {
                    // Use generated text, properly formatted
                    fiche += '```\n';
                    fiche += deg.texteGenere;
                    fiche += '\n```\n\n';
                } else {
                    // Build from individual fields
                    if (deg.auNez) fiche += `Au nez : ${deg.auNez}\n`;
                    fiche += 'En bouche :\n';
                    if (deg.acidite) fiche += `  acidité : ${getRatingLabel('acidite', deg.acidite)} (${deg.acidite}/5)\n`;
                    if (deg.amertume) fiche += `  amertume : ${getRatingLabel('amertume', deg.amertume)} (${deg.amertume}/5)\n`;
                    if (deg.corps) fiche += `  le corps : ${getRatingLabel('corps', deg.corps)} (${deg.corps}/5)\n`;
                    if (deg.longueurBouche) fiche += `  la longueur en bouche : ${getRatingLabel('longueurBouche', deg.longueurBouche)} (${deg.longueurBouche}/5)\n`;
                    if (deg.aRacheter) fiche += `à racheter : ${deg.aRacheter}\n`;
                    if (deg.noteGlobale) fiche += `Appréciation globale : ${getRatingLabel('noteGlobale', deg.noteGlobale)} (${deg.noteGlobale}/5)\n`;
                    if (deg.commentaire) fiche += `Commentaire : ${deg.commentaire}\n`;
                    fiche += '\n';
                }
            }
        }

        return fiche;
    }

    /**
     * Generate legend section
     */
    function generateLegend() {
        let legend = `## Légende\n\n`;

        legend += `### Échelle de notation (1-5)\n\n`;

        legend += `**Acidité**\n`;
        legend += `1. Très faible — 2. Faible — 3. Modérée — 4. Élevée — 5. Très élevée\n\n`;

        legend += `**Amertume**\n`;
        legend += `1. Très faible — 2. Faible — 3. Modérée — 4. Élevée — 5. Très élevée\n\n`;

        legend += `**Corps**\n`;
        legend += `1. Très léger — 2. Léger — 3. Moyen — 4. Corsé — 5. Très corsé\n\n`;

        legend += `**Longueur en bouche**\n`;
        legend += `1. Très courte — 2. Courte — 3. Moyenne — 4. Longue — 5. Très longue\n\n`;

        legend += `**Note globale**\n`;
        legend += `1. Médiocre — 2. Passable — 3. Bon — 4. Excellent — 5. Exceptionnel\n\n`;

        legend += `### Statuts\n\n`;
        legend += `- **En stock** : paquet neuf non ouvert\n`;
        legend += `- **Entamé** : en cours de consommation\n`;
        legend += `- **Fini** : paquet terminé\n`;

        return legend;
    }

    /**
     * Get rating label for a value
     */
    function getRatingLabel(field, value) {
        const labels = {
            acidite: ['', 'très faible', 'faible', 'modérée', 'élevée', 'très élevée'],
            amertume: ['', 'très faible', 'faible', 'modérée', 'élevée', 'très élevée'],
            corps: ['', 'très léger', 'léger', 'moyen', 'corsé', 'très corsé'],
            longueurBouche: ['', 'très courte', 'courte', 'moyenne', 'longue', 'très longue'],
            noteGlobale: ['', 'médiocre', 'passable', 'bon', 'excellent', 'exceptionnel']
        };

        if (labels[field] && value >= 1 && value <= 5) {
            return labels[field][value];
        }
        return '';
    }

    /**
     * Format helpers
     */
    function formatDateISO(date) {
        return date.toISOString().split('T')[0];
    }

    function formatDateFull(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('fr-FR', options);
    }

    function formatDateShort(date) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('fr-FR', options);
    }

    function formatDateTime(date) {
        const dateStr = date.toLocaleDateString('fr-FR', { 
            year: 'numeric', month: '2-digit', day: '2-digit' 
        });
        const timeStr = date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', minute: '2-digit' 
        });
        return `${dateStr} ${timeStr}`;
    }

    function escapeTableCell(text) {
        if (!text) return '-';
        return text.toString().replace(/\|/g, '\\|').replace(/\n/g, ' ');
    }

    /**
     * Download the export as a file
     */
    async function downloadExport() {
        const markdown = await generateExport();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `cave-cafe-export-${timestamp}.md`;

        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return filename;
    }

    // Public API
    return {
        generateExport,
        downloadExport,
        getRatingLabel
    };
})();
