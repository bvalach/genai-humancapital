/**
 * Living Review: Generative AI and the Future of Work
 * Main JavaScript with API integration and complete functionality
 */

// ===== CONFIGURACIÓN GLOBAL =====
const CONFIG = {
    // APIs académicas (sin necesidad de autenticación)
    apis: {
        semanticScholar: 'https://api.semanticscholar.org/graph/v1',
        crossref: 'https://api.crossref.org/works',
        openAlex: 'https://api.openalex.org/works',
        arxiv: 'https://export.arxiv.org/api/query'
    },
    
    // Keywords para búsqueda automática
    keywords: [
        // --- Conceptos Centrales y Tecnologías Específicas ---
        '"generative AI" AND "labor market"',
        '"generative AI" AND "employment"',
        '"large language models" AND "jobs"',
        '"agentic AI" AND "workforce"',
        '("ChatGPT" OR "LLM") AND "employment impact"',

        // --- Perspectiva Económica Neoclásica y de Productividad ---
        '"AI" AND "labor productivity"',
        '"automation" AND "wage inequality"',
        '"AI" AND "skill premium"',
        '"AI" AND "capital-labor substitution"',
        '"technological unemployment"',
        '"task automation" AND "labor demand"',
        '"productivity paradox" AND "AI"',
        
        // --- Perspectiva de Capital Humano y Habilidades (Skills) ---
        '"artificial intelligence" AND "human capital"',
        '"AI" AND "reskilling"',
        '"AI" AND "upskilling"',
        '"skill-biased technological change"', // Un término clásico y muy relevante
        '"future of skills" AND "AI"',
        '"workforce transition" AND "automation"',
        
        // --- Creación, Destrucción y Recomposición del Trabajo ---
        '"job displacement" AND "artificial intelligence"',
        '"job creation" AND "automation"',
        '"task-based approach" AND "AI"', // Enfocado en la metodología de análisis de tareas
        '"job quality" AND "AI"'
    ],
    // --- NUEVO: Términos núcleo para filtro estricto de relevancia ---
    coreTerms: [
        'generative ai', 'genai', 'large language model', 'llm', 'agentic ai',
        'labor market', 'employment', 'jobs', 'wages', 'wage', 'productivity',
        'task automation', 'automation', 'workforce', 'human capital',
        'reskilling', 'upskilling', 'skill-biased', 'future of work',
        'job displacement', 'job creation'
    ],
    // --- NUEVO: Indicadores de "ahead of print" / "early view" ---
    aheadOfPrintTerms: [
        'ahead of print', 'early view', 'online first', 'in press', 'forthcoming'
    ],
    // --- NUEVO: Palabras clave a excluir para aumentar la relevancia ---
    negativeKeywords: [
        'ethics', 'privacy', 'algorithmic bias', 'fairness', 'accountability',
        'transparency', 'computer vision', 'robotics surgery', 'dataset creation',
        'model architecture', 'philosophy', 'governance model'
    ],

    // --- NUEVO: Autores e Instituciones clave para búsquedas prioritarias ---
    priorityAuthorsAndInstitutions: [
        'Daron Acemoglu',
        'Erik Brynjolfsson',
        'David Autor',
        'Anna Salomons',
        'Jeffrey Sachs',
        'NBER', // National Bureau of Economic Research
        'MIT Future of Work',
        'Stanford HAI'
    ],
    // Configuración de búsqueda
    search: {
        maxResults: 100,
        minYear: 2021,  // Últimos 4 años para capturar la evolución de IA generativa
        maxYear: 2026,
        itemsPerPage: 12
    },
    
    // Fuentes de literatura gris
    graySources: {
        worldBank: {
            name: 'Banco Mundial',
            rss: 'https://openknowledge.worldbank.org/feed',
            keywords: ['future of work', 'artificial intelligence', 'employment']
        },
        oecd: {
            name: 'OCDE',
            rss: 'https://www.oecd.org/rss/general.xml',
            keywords: ['AI', 'employment', 'automation']
        },
        mckinsey: {
            name: 'McKinsey Global Institute',
            keywords: ['automation', 'AI', 'workforce']
        },
        brookings: {
            name: 'Brookings Institution',
            rss: 'https://www.brookings.edu/feed/',
            keywords: ['artificial intelligence', 'jobs']
        }
    }
};

// ===== ESTADO GLOBAL =====
const state = {
    papers: JSON.parse(localStorage.getItem('livingReview_papers') || '[]'),
    grayLiterature: JSON.parse(localStorage.getItem('livingReview_gray') || '[]'),
    currentTab: 'papers',
    currentPage: 1,
    filters: {
        search: '',
        year: '',
        type: '',
        sort: 'relevance'
    },
    loading: false,
    lastUpdate: localStorage.getItem('livingReview_lastUpdate') || null,
    // SEGURIDAD: Rate limiting simple
    lastApiCall: 0,
    minApiInterval: 2000, // 2 segundos entre llamadas
    // SELECCIÓN: Control de papers seleccionados
    selectedPapers: new Set(),
    // Diagnóstico de ingesta
    diagnostics: null
};

// ===== UTILIDADES =====
const utils = {
    // Debounce para búsquedas
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    // Generar ID único
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // Limpiar texto
    cleanText(text) {
        return text ? text.replace(/[^\w\s]/gi, '').toLowerCase() : '';
    },

    // FUNCIONES DE SEGURIDAD (basadas en el ejemplo exitoso)
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    sanitizeUrl(url) {
        if (!url) return '#';
        
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') {
                return url;
            }
        } catch (e) {
            console.warn('Invalid URL detected:', url);
        }
        return '#';
    },

    sanitizeDoi(doi) {
        if (!doi) return '';
        const doiPattern = /^10\.\d{4,}\/[^\s]+$/;
        return doiPattern.test(doi) ? doi : '';
    },

    truncateText(text, maxLength = 1000) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },
    
    hasMeaningfulAbstract(text) {
        if (!text) return false;
        const clean = text.trim().toLowerCase();
        if (clean.length < 40) return false;
        if (clean.includes('no abstract available')) return false;
        return true;
    },
    
    isAheadOfPrint(text) {
        if (!text) return false;
        const clean = text.toLowerCase();
        return CONFIG.aheadOfPrintTerms.some(term => clean.includes(term));
    },
    
    extractCrossRefYear(item) {
        if (!item || typeof item !== 'object') return 0;
        const sources = [
            item['published-print'],
            item['published-online'],
            item.published,
            item.issued,
            item.created
        ];
        for (const src of sources) {
            const year = src?.['date-parts']?.[0]?.[0];
            if (year) return year;
        }
        return 0;
    },

    // NUEVA: Validación segura de entrada
    validateInput(value, type, maxLength = 1000) {
        if (!value) return '';
        
        // Convertir a string y limpiar
        const cleanValue = String(value).trim();
        
        // Validar longitud
        if (cleanValue.length > maxLength) {
            return cleanValue.substring(0, maxLength);
        }
        
        // Validaciones por tipo
        switch (type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(cleanValue) ? cleanValue : '';
            case 'year':
                const year = parseInt(cleanValue);
                return (year >= 1900 && year <= 2030) ? year : 0;
            case 'number':
                const num = parseInt(cleanValue);
                return !isNaN(num) && num >= 0 ? num : 0;
            case 'text':
            default:
                return this.escapeHtml(cleanValue);
        }
    },

    // NUEVA: Validación segura de objetos
    validatePaperData(paper) {
        if (!paper || typeof paper !== 'object') return null;
        
        return {
            id: paper.id || this.generateId(),
            title: this.validateInput(paper.title, 'text', 500),
            authors: this.validateInput(paper.authors, 'text', 1000),
            year: this.validateInput(paper.year, 'year'),
            abstract: this.validateInput(paper.abstract, 'text', 5000),
            url: this.sanitizeUrl(paper.url),
            doi: this.sanitizeDoi(paper.doi),
            type: this.validateInput(paper.type, 'text', 50),
            source: this.validateInput(paper.source, 'text', 100),
            venue: this.validateInput(paper.venue, 'text', 200),
            citations: this.validateInput(paper.citations, 'number'),
            keywords: Array.isArray(paper.keywords) ? 
                paper.keywords.map(k => this.validateInput(k, 'text', 100)).filter(Boolean) : 
                [],
            importance: paper.importance || 'medium',
            categories: Array.isArray(paper.categories) ? 
                paper.categories.map(c => this.validateInput(c, 'text', 100)).filter(Boolean) : 
                [],
            relevanceScore: this.validateInput(paper.relevanceScore, 'number')
        };
    },

    // Categorizar papers automáticamente
    categorizePaper(paper) {
        const text = `${paper.title || ''} ${paper.abstract || ''}`.toLowerCase();
        const categories = [];
        
        const categoryKeywords = {
            'Generative AI': ['generative ai', 'large language model', 'chatgpt', 'llm', 'agentic ai'],
            'Labor Economics': ['labor market', 'employment', 'wage', 'productivity', 'skill premium', 'job polarization', 'labor demand', 'unemployment'],
            'Human Capital & Skills': ['reskilling', 'upskilling', 'skill development', 'human capital', 'workforce training', 'skill-biased'],
            'Displacement & Creation': ['job displacement', 'job creation', 'task automation', 'technological unemployment'],
            'Policy & Governance': ['ai policy', 'regulation', 'governance', 'ethics', 'ai safety'],
            'Future of Work': ['future of work', 'workforce transformation', 'human-ai collaboration']
        };
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
                categories.push(category);
            }
        }
        
        return categories.length > 0 ? categories : ['General AI'];
    },

    // Determinar si es literatura gris
    isGrayLiterature(paper) {
        const grayLitSources = [
            'world bank', 'banco mundial', 'oecd', 'ocde', 
            'mckinsey', 'brookings', 'imf', 'fmi',
            'wef', 'world economic forum', 'united nations',
            'european commission', 'government', 'ministry',
            'pwc', 'deloitte', 'kpmg', 'accenture',
            'institute', 'foundation', 'council', 'centre',
            'organization', 'organisation', 'commission'
        ];
        
        const source = (paper.source || '').toLowerCase();
        const authors = (paper.authors || '').toLowerCase();
        const title = (paper.title || '').toLowerCase();
        const abstract = (paper.abstract || '').toLowerCase();
        
        // Check if it's a report type
        if (paper.type === 'report') return true;
        
        // Check for grey literature indicators in text
        const grayLitIndicators = [
            'working paper', 'policy paper', 'white paper',
            'technical report', 'research report', 'policy brief',
            'discussion paper', 'occasional paper', 'staff paper'
        ];
        
        const hasGrayIndicator = grayLitIndicators.some(indicator =>
            title.includes(indicator) || abstract.includes(indicator)
        );
        
        return grayLitSources.some(graySource => 
            source.includes(graySource) || 
            authors.includes(graySource) || 
            title.includes(graySource)
        ) || hasGrayIndicator;
    },
    
    // Calcular score de relevancia
    calculateRelevanceScore(paper) {
        let score = 0;
        
        // Score por citas (max 30 puntos)
        const citations = paper.citations || 0;
        score += Math.min(citations / 10, 30);
        
        // Score por año (más reciente = más puntos, max 25 puntos)
        const year = paper.year || CONFIG.search.minYear;
        const yearScore = ((year - CONFIG.search.minYear) / (CONFIG.search.maxYear - CONFIG.search.minYear)) * 25;
        score += yearScore;
        
        // Score por keywords relevantes (max 25 puntos)
        const title = utils.cleanText(paper.title || '');
        const abstract = utils.cleanText(paper.abstract || '');
        const keywordMatches = CONFIG.keywords.filter(keyword => 
            title.includes(utils.cleanText(keyword)) || 
            abstract.includes(utils.cleanText(keyword))
        ).length;
        score += (keywordMatches / CONFIG.keywords.length) * 25;
        
        // Score por tipo de publicación (max 20 puntos)
        const typeScores = {
            'journal': 20,
            'conference': 15,
            'report': 18,
            'working-paper': 12,
            'book': 16
        };
        score += typeScores[paper.type] || 10;
        
        return Math.min(Math.round(score), 100);
    },
    
    // Mostrar notificación
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
            <span>${message}</span>
        `;
        
        // Agregar estilos dinámicamente si no existen
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: slideIn 0.3s ease-out;
                }
                .notification-success { background: #4ade80; }
                .notification-error { background: #ef4444; }
                .notification-info { background: #ECF6CE; color: #2c2c2c; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },

    // Generar archivo RIS para descarga
    generateRISFile(papers) {
        let risContent = '';
        
        papers.forEach(paper => {
            risContent += 'TY  - ';
            
            // Mapear tipos a códigos RIS
            const typeMap = {
                'journal': 'JOUR',
                'conference': 'CONF',
                'book': 'BOOK',
                'report': 'RPRT',
                'working-paper': 'UNPB'
            };
            
            risContent += typeMap[paper.type] || 'JOUR';
            risContent += '\n';
            
            // Título
            if (paper.title) {
                risContent += `TI  - ${paper.title}\n`;
            }
            
            // Autores
            if (paper.authors) {
                const authors = paper.authors.split(',');
                authors.forEach(author => {
                    risContent += `AU  - ${author.trim()}\n`;
                });
            }
            
            // Año
            if (paper.year) {
                risContent += `PY  - ${paper.year}\n`;
            }
            
            // URL
            if (paper.url) {
                risContent += `UR  - ${paper.url}\n`;
            }
            
            // DOI
            if (paper.doi) {
                risContent += `DO  - ${paper.doi}\n`;
            }
            
            // Abstract
            if (paper.abstract) {
                risContent += `AB  - ${paper.abstract}\n`;
            }
            
            // Keywords
            if (paper.keywords && paper.keywords.length > 0) {
                paper.keywords.forEach(keyword => {
                    risContent += `KW  - ${keyword}\n`;
                });
            }
            
            // Fuente
            if (paper.source) {
                risContent += `DB  - ${paper.source}\n`;
            }
            
            // Finalizar registro
            risContent += 'ER  - \n\n';
        });
        
        return risContent;
    },

    // Generar archivo CSV para descarga
    generateCSVFile(papers) {
        const headers = [
            'Title',
            'Authors',
            'Year',
            'Type',
            'Abstract',
            'URL',
            'DOI',
            'Keywords',
            'Source',
            'Citations',
            'Relevance Score'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        papers.forEach(paper => {
            const row = [
                this.escapeCSV(paper.title || ''),
                this.escapeCSV(paper.authors || ''),
                paper.year || '',
                this.escapeCSV(paper.type || ''),
                this.escapeCSV(paper.abstract || ''),
                this.escapeCSV(paper.url || ''),
                this.escapeCSV(paper.doi || ''),
                this.escapeCSV(paper.keywords ? paper.keywords.join('; ') : ''),
                this.escapeCSV(paper.source || ''),
                paper.citations || 0,
                paper.relevanceScore || 0
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        return csvContent;
    },

    // Escapar datos para CSV
    escapeCSV(str) {
        if (!str) return '';
        
        // Convertir a string y escapar comillas
        str = String(str).replace(/"/g, '""');
        
        // Envolver en comillas si contiene comas, saltos de línea o comillas
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            str = `"${str}"`;
        }
        
        return str;
    },

    // Descargar archivo
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// ===== API SERVICES =====
const apiService = {
    // Semantic Scholar API
    async searchSemanticScholar(query, limit = 50) {
        try {
            const url = `${CONFIG.apis.semanticScholar}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,abstract,year,authors,citationCount,url,publicationTypes,venue`;
            const response = await fetch(url);
            const data = await response.json();
            
            return data.data?.map(paper => ({
                id: paper.paperId || utils.generateId(),
                title: paper.title,
                authors: paper.authors?.map(a => a.name).join(', ') || 'Unknown',
                year: paper.year,
                abstract: paper.abstract,
                citations: paper.citationCount || 0,
                url: paper.url,
                venue: paper.venue,
                type: this.mapPublicationType(paper.publicationTypes),
                source: 'Semantic Scholar',
                addedDate: new Date().toISOString()
            })) || [];
        } catch (error) {
            console.error('Error en Semantic Scholar:', error);
            return [];
        }
    },
    
    // CrossRef API - Mejorado para mejor filtrado y manejo de errores
    async searchCrossRef(query, limit = 50) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            const url = `${CONFIG.apis.crossref}?query=${encodeURIComponent(query)}&rows=${limit}&filter=from-pub-date:2021-01-01,until-pub-date:2026-12-31&sort=published&order=desc`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !data.message || !data.message.items) {
                return [];
            }
            
            return data.message.items
                .filter(item => item && item.title && item.title[0])
                .slice(0, limit)
                .map(item => {
                    const paper = {
                        id: utils.sanitizeDoi(item.DOI) || utils.generateId(),
                        title: utils.truncateText(item.title[0], 300),
                        authors: item.author?.map(a => 
                            utils.truncateText(`${a.given || ''} ${a.family || ''}`.trim(), 100)
                        ).filter(name => name).join(', ') || 'Unknown',
                        year: utils.extractCrossRefYear(item),
                        abstract: utils.truncateText(item.abstract, 2000),
                        citations: Math.max(0, item['is-referenced-by-count'] || 0),
                        url: utils.sanitizeUrl(item.URL),
                        doi: utils.sanitizeDoi(item.DOI),
                        venue: item['container-title']?.[0],
                        type: this.mapCrossRefType(item.type),
                        source: 'CrossRef',
                        addedDate: new Date().toISOString()
                    };
                    
                    // Añadir categorías automáticamente
                    paper.categories = utils.categorizePaper(paper);
                    paper.isGrayLit = utils.isGrayLiterature(paper);
                    
                    return paper;
                });
        } catch (error) {
            console.error('Error en CrossRef:', error);
            return [];
        }
    },
    
    // OpenAlex API
    async searchOpenAlex(query, limit = 50) {
        try {
            const url = `${CONFIG.apis.openAlex}?search=${encodeURIComponent(query)}&per-page=${limit}&filter=publication_year:2020-${new Date().getFullYear()}`;
            const response = await fetch(url);
            const data = await response.json();
            
            return data.results?.map(work => ({
                id: work.id || utils.generateId(),
                title: work.display_name,
                authors: work.authorships?.map(a => a.author?.display_name).filter(Boolean).join(', ') || 'Unknown',
                year: work.publication_year,
                abstract: work.abstract_inverted_index ? this.reconstructAbstract(work.abstract_inverted_index) : null,
                citations: work.cited_by_count || 0,
                url: work.primary_location?.landing_page_url,
                venue: work.primary_location?.source?.display_name,
                type: this.mapOpenAlexType(work.type),
                source: 'OpenAlex',
                addedDate: new Date().toISOString()
            })) || [];
        } catch (error) {
            console.error('Error en OpenAlex:', error);
            return [];
        }
    },
    
    // Search primarily through CrossRef with additional sources
    async searchAllAPIs(query) {
        // SEGURIDAD: Rate limiting básico
        const now = Date.now();
        const timeSinceLastCall = now - state.lastApiCall;
        
        if (timeSinceLastCall < state.minApiInterval) {
            console.log('Rate limited, waiting...');
            await new Promise(resolve => setTimeout(resolve, state.minApiInterval - timeSinceLastCall));
        }
        
        state.lastApiCall = Date.now();
        
        const [crossrefResults, semanticResults, openalexResults] = await Promise.allSettled([
            this.searchCrossRef(query),
            this.searchSemanticScholar(query),
            this.searchOpenAlex(query)
        ]);
        
        const allResults = [
            ...(crossrefResults.status === 'fulfilled' ? crossrefResults.value : []),
            ...(semanticResults.status === 'fulfilled' ? semanticResults.value : []),
            ...(openalexResults.status === 'fulfilled' ? openalexResults.value : [])
        ];

        // Diagnóstico previo a filtros
        const preFilterCounts = {};
        allResults.forEach(p => {
            const source = p.source || 'Unknown';
            preFilterCounts[source] = (preFilterCounts[source] || 0) + 1;
        });

        // --- AJUSTE NECESARIO AQUÍ ---
        // Aplicar el filtro de palabras clave negativas antes de procesar los resultados.
        const filteredByNegative = allResults.filter(paper => {
            const textToSearch = `${paper.title || ''} ${paper.abstract || ''}`.toLowerCase();
            // Devuelve 'true' (conserva el paper) si NO encuentra NINGUNA palabra clave negativa.
            return !CONFIG.negativeKeywords.some(negKeyword => textToSearch.includes(negKeyword.toLowerCase()));
        });

        // Filtro estricto: requiere abstract con contenido y al menos un término núcleo
        const filteredStrict = filteredByNegative.filter(paper => {
            const title = utils.cleanText(paper.title || '');
            const abstract = utils.cleanText(paper.abstract || '');
            const hasAbstract = utils.hasMeaningfulAbstract(paper.abstract || '');
            const isAheadOfPrint = utils.isAheadOfPrint(`${paper.title || ''} ${paper.abstract || ''}`);
            const text = `${title} ${abstract}`;
            const hasCoreTerm = CONFIG.coreTerms.some(term => text.includes(utils.cleanText(term)));
            if ((hasAbstract || isAheadOfPrint) && hasCoreTerm) return true;
            if (paper.source === 'CrossRef') {
                const hasStrongTitle = title.length > 20 && hasCoreTerm;
                const hasSignal = (paper.citations || 0) > 0 || !!paper.doi;
                return hasStrongTitle && hasSignal;
            }
            return false;
        });
        // --- FIN DEL AJUSTE ---
        
        // Eliminar duplicados basados en título
        const uniqueResults = [];
        const seenTitles = new Set();
        
        // ¡Importante! Usar 'filteredStrict' en lugar de 'allResults' en el bucle
        for (const paper of filteredStrict) { 
            const cleanTitle = utils.cleanText(paper.title || '');
            if (cleanTitle && !seenTitles.has(cleanTitle)) {
                seenTitles.add(cleanTitle);
                paper.relevanceScore = utils.calculateRelevanceScore(paper);
                uniqueResults.push(paper);
            }
        }

        const sortedResults = uniqueResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

        const postFilterCounts = {};
        sortedResults.forEach(p => {
            const source = p.source || 'Unknown';
            postFilterCounts[source] = (postFilterCounts[source] || 0) + 1;
        });
        
        return {
            results: sortedResults,
            diagnostics: {
                preFilterCounts,
                postFilterCounts,
                preFilterTotal: allResults.length,
                postFilterTotal: sortedResults.length
            }
        };
    },
    
    // Mapear tipos de publicación
    mapPublicationType(types) {
        if (!types || !Array.isArray(types)) return 'journal';
        const type = types[0]?.toLowerCase() || '';
        if (type.includes('conference')) return 'conference';
        if (type.includes('journal')) return 'journal';
        if (type.includes('book')) return 'book';
        return 'journal';
    },
    
    mapCrossRefType(type) {
        const typeMap = {
            'journal-article': 'journal',
            'proceedings-article': 'conference',
            'book-chapter': 'book',
            'book': 'book',
            'report': 'report',
            'report-series': 'report',
            'other': 'report',
            'dataset': 'report',
            'standard': 'report',
            'reference-book': 'book',
            'monograph': 'book',
            'edited-book': 'book'
        };
        return typeMap[type] || 'working-paper';
    },
    
    mapOpenAlexType(type) {
        const typeMap = {
            'article': 'journal',
            'book': 'book',
            'dataset': 'report',
            'thesis': 'report'
        };
        return typeMap[type] || 'journal';
    },
    
    // Reconstruir abstract de OpenAlex
    reconstructAbstract(invertedIndex) {
        if (!invertedIndex) return null;
        
        const words = [];
        for (const [word, positions] of Object.entries(invertedIndex)) {
            for (const pos of positions) {
                words[pos] = word;
            }
        }
        
        return words.filter(Boolean).join(' ').substring(0, 500);
    }
};

// ===== GESTIÓN DE DATOS =====
const dataManager = {
    // Guardar en localStorage
    saveToStorage() {
        localStorage.setItem('livingReview_papers', JSON.stringify(state.papers));
        localStorage.setItem('livingReview_gray', JSON.stringify(state.grayLiterature));
        localStorage.setItem('livingReview_lastUpdate', new Date().toISOString());
        state.lastUpdate = new Date().toISOString();
    },
    
    // Add paper - All papers in unified list
    addPaper(paper) {
        // SEGURIDAD: Validar y limpiar datos del paper
        const validatedPaper = utils.validatePaperData(paper);
        if (!validatedPaper || !validatedPaper.title) return false;
        
        validatedPaper.id = validatedPaper.id || utils.generateId();
        validatedPaper.addedDate = new Date().toISOString();
        validatedPaper.relevanceScore = utils.calculateRelevanceScore(validatedPaper);
        validatedPaper.categories = validatedPaper.categories || utils.categorizePaper(validatedPaper);
        validatedPaper.isGrayLit = validatedPaper.isGrayLit !== undefined ? validatedPaper.isGrayLit : utils.isGrayLiterature(validatedPaper);
        
        // Check for duplicates in papers list
        const cleanTitle = utils.cleanText(validatedPaper.title);
        const existsInPapers = state.papers.some(p => 
            utils.cleanText(p.title) === cleanTitle
        );
        
        if (!existsInPapers) {
            // Add all papers to unified list
            state.papers.unshift(validatedPaper);
            // Also add to grey literature count if it's grey lit
            if (validatedPaper.isGrayLit && !state.grayLiterature.some(p => utils.cleanText(p.title) === cleanTitle)) {
                state.grayLiterature.unshift(validatedPaper);
            }
            this.saveToStorage();
            return true;
        }
        return false;
    },
    
    // Agregar múltiples papers
    addPapers(papers) {
        let addedCount = 0;
        papers.forEach(paper => {
            if (this.addPaper(paper)) {
                addedCount++;
            }
        });
        return addedCount;
    },
    
    // Filtrar papers
    getFilteredPapers() {
        let filtered = [...state.papers];
        
        // Filtro de búsqueda
        if (state.filters.search) {
            const searchTerm = utils.cleanText(state.filters.search);
            filtered = filtered.filter(paper => 
                utils.cleanText(paper.title || '').includes(searchTerm) ||
                utils.cleanText(paper.authors || '').includes(searchTerm) ||
                utils.cleanText(paper.abstract || '').includes(searchTerm)
            );
        }
        
        // Filtro de año
        if (state.filters.year) {
            filtered = filtered.filter(paper => 
                paper.year && paper.year.toString() === state.filters.year
            );
        }
        
        // Filtro de tipo
        if (state.filters.type) {
            filtered = filtered.filter(paper => paper.type === state.filters.type);
        }
        
        // Ordenamiento
        switch (state.filters.sort) {
            case 'date':
                filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
                break;
            case 'citations':
                filtered.sort((a, b) => (b.citations || 0) - (a.citations || 0));
                break;
            case 'impact':
                filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
                break;
            default: // relevance
                filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        }
        
        return filtered;
    },
    
    // Get statistics
    getStats() {
        return {
            totalPapers: state.papers.length,
            grayLiterature: state.grayLiterature.length,
            lastUpdate: state.lastUpdate ? utils.formatDate(state.lastUpdate) : 'Never'
        };
    }
};

// ===== GESTIÓN DE UI =====
const uiManager = {
    // Inicializar eventos
    init() {
        this.bindEvents();
        this.updateStats();
        this.renderPapers();
        this.updateSelectionControls();
        
        // Auto-refresh si no hay datos
        if (state.papers.length === 0) {
            this.refreshData();
        }
    },
    
    // Vincular eventos
    bindEvents() {
        // Navegación entre tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.target.closest('.nav-tab').dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        // Búsqueda
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', utils.debounce((e) => {
            state.filters.search = e.target.value;
            state.currentPage = 1;
            this.renderPapers();
        }, 300));
        
        // Filtros
        ['year-filter', 'type-filter', 'sort-filter'].forEach(filterId => {
            const element = document.getElementById(filterId);
            element.addEventListener('change', (e) => {
                const filterType = filterId.split('-')[0];
                state.filters[filterType] = e.target.value;
                state.currentPage = 1;
                this.renderPapers();
            });
        });
        
        // Limpiar filtros
        document.getElementById('clear-filters').addEventListener('click', () => {
            state.filters = { search: '', year: '', type: '', sort: 'relevance' };
            state.currentPage = 1;
            
            document.getElementById('search-input').value = '';
            document.getElementById('year-filter').value = '';
            document.getElementById('type-filter').value = '';
            document.getElementById('sort-filter').value = 'relevance';
            
            this.renderPapers();
        });
        
        // Refresh
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });
        


        // Modal events
        const modal = document.getElementById('modal');
        const closeButton = document.querySelector('.close-button');
        
        closeButton.addEventListener('click', () => this.closeModal());
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeModal();
            }
        });

        // Soporte para teclado
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                this.closeModal();
            }
        });

        // Eventos de selección
        document.getElementById('select-all').addEventListener('click', () => {
            this.selectAllPapers();
        });

        document.getElementById('deselect-all').addEventListener('click', () => {
            this.deselectAllPapers();
        });

        document.getElementById('download-csv').addEventListener('click', () => {
            this.downloadSelectedPapers('csv');
        });

        document.getElementById('download-ris').addEventListener('click', () => {
            this.downloadSelectedPapers('ris');
        });
    },
    
    // Cambiar tab
    switchTab(tabId) {
        // Actualizar navegación
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Actualizar contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
        
        state.currentTab = tabId;
        
        // Render tab-specific content
        if (tabId === 'trends') {
            this.renderTrends();
        } else if (tabId === 'litmaps') {
            // LitMaps tab doesn't need special rendering, iframe loads automatically
            console.log('LitMaps tab activated');
        }
    },
    
    // Actualizar estadísticas
    updateStats() {
        const stats = dataManager.getStats();
        
        document.getElementById('total-papers').textContent = stats.totalPapers;
        document.getElementById('gray-literature').textContent = stats.grayLiterature;
        document.getElementById('last-update').textContent = stats.lastUpdate;
    },
    
    // Renderizar papers - Mejorado con mejor manejo de estados
    renderPapers() {
        const container = document.getElementById('papers-grid');
        const filtered = dataManager.getFilteredPapers();
        
        // Limpiar contenedor
        container.innerHTML = '';
        
        if (state.loading) {
            this.showLoadingState(container);
            return;
        }
        
        if (filtered.length === 0) {
            this.showEmptyState(container);
            return;
        }
        
        // Paginación
        const startIndex = (state.currentPage - 1) * CONFIG.search.itemsPerPage;
        const endIndex = startIndex + CONFIG.search.itemsPerPage;
        const paginatedPapers = filtered.slice(startIndex, endIndex);
        
        // Crear y añadir tarjetas
        paginatedPapers.forEach((paper, index) => {
            const card = this.createPaperCard(paper);
            // Añadir animación de entrada escalonada
            card.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(card);
        });
        
        this.renderPagination(filtered.length);
        this.updateSelectionControls();
    },

    // Show improved loading state
    showLoadingState(container) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.style.gridColumn = '1 / -1';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading papers...</div>
            <div class="loading-subtext">This may take a few moments</div>
        `;
        container.appendChild(loadingDiv);
    },

    // Show empty state
    showEmptyState(container) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'error-state';
        emptyDiv.style.gridColumn = '1 / -1';
        emptyDiv.innerHTML = `
            <div class="error-icon">📄</div>
            <div class="error-message">No papers found</div>
            <p>Try adjusting the filters or updating the data.</p>
            <button class="retry-btn" onclick="uiManager.refreshData()">
                <i class="fas fa-sync-alt"></i>
                Update data
            </button>
        `;
        container.appendChild(emptyDiv);
    },

    // Show error state
    showErrorState(container, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-state';
        errorDiv.style.gridColumn = '1 / -1';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
            <button class="retry-btn" onclick="location.reload()">
                <i class="fas fa-redo"></i>
                Try again
            </button>
        `;
        container.appendChild(errorDiv);
    },
    
    // Crear tarjeta de paper - Mejorado con modal y seguridad
    createPaperCard(paper) {
        const card = document.createElement('article');
        card.className = 'paper-card';
        card.style.position = 'relative';
        card.dataset.id = paper.id;
        
        // Sanitise data
        const safeTitle = utils.escapeHtml(utils.truncateText(paper.title || 'Untitled', 200));
        const safeAuthors = utils.escapeHtml(utils.truncateText(paper.authors || 'Unknown authors', 150));
        const safeYear = paper.year || 'N/A';
        const safeAbstract = utils.escapeHtml(utils.truncateText(paper.abstract || '', 300));
        
        // Badge de fuente
        const sourceClass = paper.isGrayLit ? 'gray-literature' : 'academic';
        const sourceBadge = document.createElement('div');
        sourceBadge.className = `paper-source-badge ${sourceClass}`;
        sourceBadge.textContent = paper.source || 'Manual';
        
        // Checkbox para selección
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'paper-checkbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.paperId = paper.id;
        checkbox.checked = state.selectedPapers.has(paper.id);
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Evitar que se abra el modal
            this.togglePaperSelection(paper.id, e.target.checked);
        });
        checkboxContainer.appendChild(checkbox);
        
        // Title
        const titleElement = document.createElement('h3');
        titleElement.className = 'paper-title';
        titleElement.textContent = paper.title || 'Untitled';
        
        // Authors
        const authorsElement = document.createElement('p');
        authorsElement.className = 'paper-authors';
        authorsElement.textContent = paper.authors || 'Unknown authors';
        
        // Meta información
        const metaElement = document.createElement('div');
        metaElement.className = 'paper-meta';
        metaElement.innerHTML = `
            <span class="paper-year">
                <i class="fas fa-calendar"></i>
                ${safeYear}
            </span>
            <span class="paper-type">
                <i class="fas fa-tag"></i>
                ${this.getTypeLabel(paper.type)}
            </span>
            <span class="paper-citations">
                <i class="fas fa-quote-right"></i>
                ${paper.citations || 0} citations
            </span>
        `;
        
        // Abstract (si existe)
        let abstractElement = null;
        if (paper.abstract) {
            abstractElement = document.createElement('p');
            abstractElement.className = 'paper-abstract';
            abstractElement.textContent = utils.truncateText(paper.abstract, 300);
        }
        
        // Categorías
        const categoriesElement = document.createElement('div');
        categoriesElement.className = 'paper-keywords';
        
        if (paper.categories && paper.categories.length > 0) {
            paper.categories.slice(0, 3).forEach(category => {
                const categorySpan = document.createElement('span');
                categorySpan.className = 'keyword';
                categorySpan.textContent = category;
                categoriesElement.appendChild(categorySpan);
            });
        }
        
        // Footer con score
        const footerElement = document.createElement('div');
        footerElement.className = 'paper-footer';
        footerElement.innerHTML = `
            <div class="paper-score">
                <span>Score:</span>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${paper.relevanceScore || 0}%"></div>
                </div>
                <span>${paper.relevanceScore || 0}</span>
            </div>
        `;
        
        // Ensamblar tarjeta
        card.appendChild(sourceBadge);
        card.appendChild(checkboxContainer);
        card.appendChild(titleElement);
        card.appendChild(authorsElement);
        card.appendChild(metaElement);
        if (abstractElement) card.appendChild(abstractElement);
        card.appendChild(categoriesElement);
        card.appendChild(footerElement);
        
        // Evento click para abrir modal
        card.addEventListener('click', () => this.openModal(paper));
        card.style.cursor = 'pointer';
        
        return card;
    },

    // Abrir modal con detalles del paper
    openModal(paper) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalAuthors = document.getElementById('modal-authors');
        const modalDate = document.getElementById('modal-date');
        const modalDoi = document.getElementById('modal-doi');
        const modalCategories = document.getElementById('modal-categories');
        const modalAbstract = document.getElementById('modal-abstract');
        const modalLink = document.getElementById('modal-link');
        const modalCite = document.getElementById('modal-cite');
        
        // Sanitise and display data
        modalTitle.textContent = utils.truncateText(paper.title || 'Untitled', 300);
        modalAuthors.textContent = `Authors: ${utils.truncateText(paper.authors || 'N/A', 200)}`;
        modalDate.textContent = `Date: ${paper.year || 'N/A'}`;
        
        // DOI
        const safeDoi = utils.sanitizeDoi(paper.doi);
        if (safeDoi) {
            modalDoi.innerHTML = '';
            const doiText = document.createElement('span');
            doiText.textContent = 'DOI: ';
            const doiLink = document.createElement('a');
            doiLink.href = `https://doi.org/${safeDoi}`;
            doiLink.target = '_blank';
            doiLink.rel = 'noopener noreferrer';
            doiLink.textContent = safeDoi;
            modalDoi.appendChild(doiText);
            modalDoi.appendChild(doiLink);
            modalDoi.style.display = 'block';
        } else {
            modalDoi.style.display = 'none';
        }
        
        // Categorías
        modalCategories.innerHTML = '';
        if (paper.categories && paper.categories.length > 0) {
            paper.categories.forEach(category => {
                const categoryTag = document.createElement('span');
                categoryTag.className = 'modal-category-tag';
                categoryTag.textContent = category;
                modalCategories.appendChild(categoryTag);
            });
        }
        
        // Abstract
        modalAbstract.textContent = utils.truncateText(paper.abstract || 'No abstract available.', 2000);
        
        // Link principal
        const safeUrl = utils.sanitizeUrl(paper.url);
        modalLink.href = safeUrl;
        if (safeUrl === '#') {
            modalLink.style.display = 'none';
        } else {
            modalLink.style.display = 'inline-flex';
            modalLink.rel = 'noopener noreferrer';
        }
        
        // Botón citar
        modalCite.onclick = () => this.copyCitation(paper);
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    },

    // Cerrar modal
    closeModal() {
        const modal = document.getElementById('modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    // Copiar cita al portapapeles
    copyCitation(paper) {
        const citation = this.generateCitation(paper);
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(citation).then(() => {
                utils.showNotification('Citation copied to clipboard', 'success');
            }).catch(() => {
                this.fallbackCopyText(citation);
            });
        } else {
            this.fallbackCopyText(citation);
        }
    },

    // Fallback para copiar texto
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            utils.showNotification('Citation copied to clipboard', 'success');
        } catch (err) {
            utils.showNotification('Error copying citation', 'error');
        }
        document.body.removeChild(textArea);
    },

    // Generate citation in APA format
    generateCitation(paper) {
        const authors = paper.authors || 'Unknown author';
        const year = paper.year || 'no date';
        const title = paper.title || 'Untitled';
        const doi = paper.doi ? ` https://doi.org/${paper.doi}` : '';
        const url = !paper.doi && paper.url ? ` ${paper.url}` : '';
        
        return `${authors} (${year}). ${title}.${doi}${url}`;
    },
    
    // Extraer keywords del contenido
    extractKeywords(paper) {
        const text = `${paper.title || ''} ${paper.abstract || ''}`.toLowerCase();
        const relevantKeywords = CONFIG.keywords.filter(keyword => 
            text.includes(keyword.toLowerCase())
        );
        
        if (relevantKeywords.length === 0) {
            return ['IA', 'Trabajo', 'Tecnología'];
        }
        
        return relevantKeywords.slice(0, 5);
    },
    
    // Get type label
    getTypeLabel(type) {
        const labels = {
            'journal': 'Journal',
            'conference': 'Conference',
            'report': 'Report',
            'working-paper': 'Working Paper',
            'book': 'Book'
        };
        return labels[type] || 'Unknown';
    },
    
    // Renderizar paginación
    renderPagination(totalItems) {
        const container = document.getElementById('pagination');
        const totalPages = Math.ceil(totalItems / CONFIG.search.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Botón anterior
        paginationHTML += `
            <button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} 
                    onclick="uiManager.changePage(${state.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
                paginationHTML += `
                    <button class="page-btn ${i === state.currentPage ? 'active' : ''}" 
                            onclick="uiManager.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
                paginationHTML += '<span class="page-ellipsis">...</span>';
            }
        }
        
        // Botón siguiente
        paginationHTML += `
            <button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="uiManager.changePage(${state.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        container.innerHTML = paginationHTML;
    },
    
    // Cambiar página
    changePage(page) {
        state.currentPage = page;
        this.renderPapers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    // Refresh de datos - Mejorado con mejor manejo de errores y timeouts
    
    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        const container = document.getElementById('papers-grid');
        
        refreshBtn.classList.add('loading');
        state.loading = true;
        this.renderPapers(); // Mostrar estado de carga
        
        try {
            utils.showNotification('Updating data from APIs...', 'info');
            
            const searchPromises = [];
            
            // Usar la lista de keywords recomendada o tu lista principal
            const priorityKeywords = [
                    '"generative AI" AND "labor market"',
                    '"AI" AND "labor productivity"',
                    '"automation" AND "human capital"'
            ];
            
            for (const keyword of priorityKeywords) {
                const searchPromise = Promise.race([
                    apiService.searchAllAPIs(keyword),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Search timeout')), 20000)
                    )
                ]);
                searchPromises.push(searchPromise);
            }
    
            // --- NUEVO: Añadir búsquedas por autores e instituciones clave ---
            console.log('Adding priority author and institution searches...');
            // Usamos una query base para asegurar que el trabajo del autor sea relevante al tema
            const baseQuery = '"artificial intelligence" OR "automation"'; 
            for (const entity of CONFIG.priorityAuthorsAndInstitutions) {
                // Creamos una query que combina el tema con el autor/institución
                const specificQuery = `(${baseQuery}) AND "${entity}"`;
                console.log(`Creating promise for query: ${specificQuery}`);
                
                const searchPromise = Promise.race([
                    apiService.searchAllAPIs(specificQuery),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Search timeout for ${entity}`)), 20000)
                    )
                ]);
                searchPromises.push(searchPromise);
            }
            // --- FIN DE LA NUEVA SECCIÓN ---

            // Ejecutar búsquedas en paralelo con manejo de errores
            const results = await Promise.allSettled(searchPromises);
            
            const allResults = [];
            let successfulSearches = 0;
            const diagnostics = {
                preFilterCounts: {},
                postFilterCounts: {},
                preFilterTotal: 0,
                postFilterTotal: 0
            };
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value && Array.isArray(result.value.results)) {
                    allResults.push(...result.value.results);
                    successfulSearches++;
                    
                    const diag = result.value.diagnostics;
                    if (diag) {
                        diagnostics.preFilterTotal += diag.preFilterTotal || 0;
                        diagnostics.postFilterTotal += diag.postFilterTotal || 0;
                        for (const [source, count] of Object.entries(diag.preFilterCounts || {})) {
                            diagnostics.preFilterCounts[source] = (diagnostics.preFilterCounts[source] || 0) + count;
                        }
                        for (const [source, count] of Object.entries(diag.postFilterCounts || {})) {
                            diagnostics.postFilterCounts[source] = (diagnostics.postFilterCounts[source] || 0) + count;
                        }
                    }
                } else {
                    console.warn(`Search ${index + 1} failed:`, result.reason);
                }
            });
            
            state.diagnostics = diagnostics;
            
            // Filtrar por fecha 2021+ antes de agregar (últimos 4 años)
            const recentPapers = allResults.filter(paper => {
                if (paper.year) {
                    return paper.year >= CONFIG.search.minYear && paper.year <= CONFIG.search.maxYear;
                }
                return utils.isAheadOfPrint(`${paper.title || ''} ${paper.abstract || ''}`);
            });
            
            const addedCount = dataManager.addPapers(recentPapers);
            
            this.updateStats();
            this.renderPapers();
            
            if (successfulSearches === 0) {
                utils.showNotification('Could not load data from APIs. Please check your connection.', 'error');
            } else if (addedCount === 0) {
                utils.showNotification('No new papers found.', 'info');
            } else {
                utils.showNotification(
                    `Update completed. ${addedCount} new papers added from ${successfulSearches} sources.`, 
                    'success'
                );
            }
            
        } catch (error) {
            console.error('General error updating data:', error);
            utils.showNotification('Unexpected error updating data.', 'error');
            this.showErrorState(container, 'Error loading data from APIs');
        } finally {
            refreshBtn.classList.remove('loading');
            state.loading = false;
            this.renderPapers();
        }
    },
    

    

    
    // Renderizar tendencias
    renderTrends() {
        this.renderKeyMetrics();
        this.renderYearlyOutput();
        this.renderDiagnostics();
        this.renderTopics();
        this.renderTopKeywords();
        this.renderTopVenues();
        this.renderQualityCoverage();
        this.renderAuthors();
        this.renderSources();
        this.renderTypes();
    },

    // Diagnóstico básico de ingesta
    renderDiagnostics() {
        const container = document.getElementById('diagnostics-panel');
        const total = state.papers.length;
        if (total === 0) {
            container.innerHTML = '<p>No data available</p>';
            return;
        }
        const diag = state.diagnostics;
        const sourceCounts = {};
        state.papers.forEach(p => {
            const source = p.source || 'Unknown';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        
        const missingAbstract = state.papers.filter(p => !utils.hasMeaningfulAbstract(p.abstract || '')).length;
        const missingYear = state.papers.filter(p => !p.year).length;
        const missingDoi = state.papers.filter(p => !p.doi).length;
        const missingUrl = state.papers.filter(p => !p.url).length;
        
        const sortedSources = Object.entries(sourceCounts).sort(([,a], [,b]) => b - a);
        const diagSources = diag ? Object.keys(diag.preFilterCounts || {}).sort() : [];
        
        container.innerHTML = `
            <div class="diag-block">
                <div class="diag-title">Source mix (in library)</div>
                ${sortedSources.map(([source, count]) => {
                    const pct = ((count / total) * 100).toFixed(1);
                    return `<div class="diag-row">
                        <span class="diag-label">${utils.escapeHtml(source)}</span>
                        <span class="diag-value">${count} (${pct}%)</span>
                    </div>`;
                }).join('')}
            </div>
            <div class="diag-block">
                <div class="diag-title">Ingestion (pre vs post filter)</div>
                ${diag ? diagSources.map(source => {
                    const pre = diag.preFilterCounts[source] || 0;
                    const post = diag.postFilterCounts[source] || 0;
                    return `<div class="diag-row">
                        <span class="diag-label">${utils.escapeHtml(source)}</span>
                        <span class="diag-value">${pre} → ${post}</span>
                    </div>`;
                }).join('') : '<div class="diag-row"><span class="diag-label">No recent run</span><span class="diag-value">—</span></div>'}
            </div>
            <div class="diag-block">
                <div class="diag-title">Missing fields</div>
                <div class="diag-row"><span class="diag-label">Abstract</span><span class="diag-value">${missingAbstract}</span></div>
                <div class="diag-row"><span class="diag-label">Year</span><span class="diag-value">${missingYear}</span></div>
                <div class="diag-row"><span class="diag-label">DOI</span><span class="diag-value">${missingDoi}</span></div>
                <div class="diag-row"><span class="diag-label">URL</span><span class="diag-value">${missingUrl}</span></div>
            </div>
        `;
    },

    // Top venues
    renderTopVenues() {
        const container = document.getElementById('venues-list');
        const venueCounts = {};
        
        state.papers.forEach(paper => {
            const venue = (paper.venue || '').trim();
            if (venue) {
                venueCounts[venue] = (venueCounts[venue] || 0) + 1;
            }
        });
        
        const sortedVenues = Object.entries(venueCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        if (sortedVenues.length === 0) {
            container.innerHTML = '<p>No venue data available</p>';
            return;
        }
        
        container.innerHTML = sortedVenues.map(([venue, count]) => 
            `<div class="author-item">
                <span class="author-name">${utils.escapeHtml(venue)}</span>
                <span class="author-count">${count}</span>
            </div>`
        ).join('');
    },

    // Top keywords cloud
    renderTopKeywords() {
        const container = document.getElementById('keywords-cloud');
        const keywordCounts = {};
        const stopwords = new Set([
            'the','and','for','with','from','that','this','into','over','under','about','between','using',
            'ai','artificial','intelligence','generative','model','models','paper','study','analysis','evidence',
            'effects','impact','impacts','effects','work','future','jobs','job','labor','labour','market','markets',
            'data','based','new','system','systems','approach','toward','towards','case','cases','review','evolution',
            'of','in','on','to','a','an','is','are','by','as','at','be','or','we','our','their','they','it','its'
        ]);
        
        state.papers.forEach(paper => {
            if (Array.isArray(paper.keywords) && paper.keywords.length > 0) {
                paper.keywords.forEach(k => {
                    const key = utils.cleanText(k);
                    if (key && key.length >= 4 && !stopwords.has(key)) {
                        keywordCounts[key] = (keywordCounts[key] || 0) + 1;
                    }
                });
                return;
            }
            
            const text = `${paper.title || ''} ${paper.abstract || ''}`.toLowerCase();
            const tokens = text.split(/[^a-z0-9]+/g).filter(Boolean);
            tokens.forEach(token => {
                if (token.length >= 4 && !stopwords.has(token)) {
                    keywordCounts[token] = (keywordCounts[token] || 0) + 1;
                }
            });
        });
        
        const sortedKeywords = Object.entries(keywordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 40);
        
        if (sortedKeywords.length === 0) {
            container.innerHTML = '<p>No keyword data available</p>';
            return;
        }
        
        const maxCount = Math.max(...sortedKeywords.map(([,c]) => c));
        container.innerHTML = sortedKeywords.map(([keyword, count]) => {
            const size = Math.min(12 + Math.round((count / maxCount) * 14), 26);
            return `<span class="keyword-tag" style="font-size: ${size}px">
                ${utils.escapeHtml(keyword)} (${count})
            </span>`;
        }).join('');
    },

    // Métricas clave para living review
    renderKeyMetrics() {
        const container = document.getElementById('key-metrics');
        const total = state.papers.length;
        if (total === 0) {
            container.innerHTML = '<p>No data available</p>';
            return;
        }
        
        const now = Date.now();
        const last30Days = state.papers.filter(p => {
            const ts = Date.parse(p.addedDate || '');
            return ts && (now - ts) <= 30 * 24 * 60 * 60 * 1000;
        }).length;
        const last90Days = state.papers.filter(p => {
            const ts = Date.parse(p.addedDate || '');
            return ts && (now - ts) <= 90 * 24 * 60 * 60 * 1000;
        }).length;
        
        const years = state.papers.map(p => p.year).filter(Boolean);
        const minYear = years.length ? Math.min(...years) : 'N/A';
        const maxYear = years.length ? Math.max(...years) : 'N/A';
        
        const citations = state.papers.map(p => p.citations || 0);
        const avgCitations = citations.length ? (citations.reduce((a, b) => a + b, 0) / citations.length) : 0;
        const medianCitations = citations.length ? citations.sort((a, b) => a - b)[Math.floor(citations.length / 2)] : 0;
        
        container.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">Total papers</span>
                <span class="metric-value">${total}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">New (30 days)</span>
                <span class="metric-value">${last30Days}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">New (90 days)</span>
                <span class="metric-value">${last90Days}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Year range</span>
                <span class="metric-value">${minYear}–${maxYear}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Avg citations</span>
                <span class="metric-value">${avgCitations.toFixed(1)}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Median citations</span>
                <span class="metric-value">${medianCitations}</span>
            </div>
        `;
    },

    // Producción anual
    renderYearlyOutput() {
        const container = document.getElementById('yearly-output');
        const yearCounts = {};
        
        state.papers.forEach(paper => {
            if (paper.year) {
                yearCounts[paper.year] = (yearCounts[paper.year] || 0) + 1;
            }
        });
        
        const years = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
        if (years.length === 0) {
            container.innerHTML = '<p>No data available</p>';
            return;
        }
        
        const maxCount = Math.max(...Object.values(yearCounts));
        container.innerHTML = years.map(year => {
            const count = yearCounts[year];
            const percentage = maxCount ? Math.round((count / maxCount) * 100) : 0;
            return `
                <div class="bar-item">
                    <span class="bar-label">${year}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="bar-value">${count}</span>
                </div>
            `;
        }).join('');
    },
    
    // Renderizar nube de temas
    renderTopics() {
        const container = document.getElementById('topics-cloud');
        const topicCounts = {};
        
        state.papers.forEach(paper => {
            const keywords = this.extractKeywords(paper);
            keywords.forEach(keyword => {
                topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
            });
        });
        
        const sortedTopics = Object.entries(topicCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);
        
        container.innerHTML = sortedTopics.map(([topic, count]) => 
            `<span class="topic-tag" style="font-size: ${Math.min(12 + count * 2, 24)}px">
                ${utils.escapeHtml(topic)} (${count})
             </span>`
        ).join('');
    },
    
    // Renderizar autores destacados
    renderAuthors() {
        const container = document.getElementById('authors-list');
        const authorCounts = {};
        
        state.papers.forEach(paper => {
            const authors = paper.authors?.split(',') || [];
            authors.forEach(author => {
                const cleanAuthor = author.trim();
                if (cleanAuthor && cleanAuthor !== 'Unknown') {
                    authorCounts[cleanAuthor] = (authorCounts[cleanAuthor] || 0) + 1;
                }
            });
        });
        
        const sortedAuthors = Object.entries(authorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        container.innerHTML = sortedAuthors.map(([author, count]) => 
            `<div class="author-item">
                <span class="author-name">${utils.escapeHtml(author)}</span>
                <span class="author-count">${count} papers</span>
             </div>`
        ).join('');
    },
    
    // Renderizar fuentes
    renderSources() {
        const container = document.getElementById('sources-breakdown');
        const sourceCounts = {};
        
        state.papers.forEach(paper => {
            const source = paper.source || 'Unknown';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        
        const total = state.papers.length;
        
        container.innerHTML = Object.entries(sourceCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([source, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                return `
                    <div class="source-item">
                        <span class="source-name">${utils.escapeHtml(source)}</span>
                        <div class="source-bar">
                            <div class="source-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="source-count">${count} (${percentage}%)</span>
                    </div>
                `;
            }).join('');
    },

    // Renderizar tipos de publicación
    renderTypes() {
        const container = document.getElementById('types-breakdown');
        const typeCounts = {};
        
        state.papers.forEach(paper => {
            const type = this.getTypeLabel(paper.type || 'Unknown');
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        const total = state.papers.length;
        
        if (total === 0) {
            container.innerHTML = '<p>No data available</p>';
            return;
        }
        
        container.innerHTML = Object.entries(typeCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                return `
                    <div class="source-item">
                        <span class="source-name">${utils.escapeHtml(type)}</span>
                        <div class="source-bar">
                            <div class="source-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="source-count">${count} (${percentage}%)</span>
                    </div>
                `;
            }).join('');
    },

    // Calidad y cobertura
    renderQualityCoverage() {
        const container = document.getElementById('quality-coverage');
        const total = state.papers.length;
        if (total === 0) {
            container.innerHTML = '<p>No data available</p>';
            return;
        }
        
        const withAbstract = state.papers.filter(p => utils.hasMeaningfulAbstract(p.abstract || '')).length;
        const withDoi = state.papers.filter(p => p.doi).length;
        const withUrl = state.papers.filter(p => p.url).length;
        const aheadOfPrint = state.papers.filter(p => utils.isAheadOfPrint(`${p.title || ''} ${p.abstract || ''}`)).length;
        
        const abstractPct = ((withAbstract / total) * 100).toFixed(1);
        const doiPct = ((withDoi / total) * 100).toFixed(1);
        const urlPct = ((withUrl / total) * 100).toFixed(1);
        const aopPct = ((aheadOfPrint / total) * 100).toFixed(1);
        
        container.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">Abstract coverage</span>
                <span class="metric-value">${abstractPct}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">DOI coverage</span>
                <span class="metric-value">${doiPct}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">URL coverage</span>
                <span class="metric-value">${urlPct}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Ahead of print</span>
                <span class="metric-value">${aopPct}%</span>
            </div>
        `;
    },

    // ===== FUNCIONES DE SELECCIÓN =====
    
    // Alternar selección de paper
    togglePaperSelection(paperId, isSelected) {
        if (isSelected) {
            state.selectedPapers.add(paperId);
        } else {
            state.selectedPapers.delete(paperId);
        }
        this.updateSelectionControls();
    },

    // Seleccionar todos los papers visibles
    selectAllPapers() {
        const filtered = dataManager.getFilteredPapers();
        const startIndex = (state.currentPage - 1) * CONFIG.search.itemsPerPage;
        const endIndex = startIndex + CONFIG.search.itemsPerPage;
        const paginatedPapers = filtered.slice(startIndex, endIndex);
        
        paginatedPapers.forEach(paper => {
            state.selectedPapers.add(paper.id);
        });
        
        this.updateSelectionControls();
        this.updateCheckboxes();
    },

    // Deseleccionar todos los papers
    deselectAllPapers() {
        state.selectedPapers.clear();
        this.updateSelectionControls();
        this.updateCheckboxes();
    },

    // Actualizar estado de checkboxes
    updateCheckboxes() {
        const checkboxes = document.querySelectorAll('.paper-checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const paperId = checkbox.dataset.paperId;
            checkbox.checked = state.selectedPapers.has(paperId);
        });
    },

    // Actualizar controles de selección
    updateSelectionControls() {
        const selectedCount = state.selectedPapers.size;
        const selectedCountElement = document.getElementById('selected-count');
        const downloadCsvBtn = document.getElementById('download-csv');
        const downloadRisBtn = document.getElementById('download-ris');
        
        selectedCountElement.textContent = selectedCount;
        
        const hasSelection = selectedCount > 0;
        downloadCsvBtn.disabled = !hasSelection;
        downloadRisBtn.disabled = !hasSelection;
    },

    // Descargar papers seleccionados
    downloadSelectedPapers(format) {
        const selectedPapers = state.papers.filter(paper => 
            state.selectedPapers.has(paper.id)
        );
        
        if (selectedPapers.length === 0) {
            utils.showNotification('No papers selected for download', 'error');
            return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        
        if (format === 'csv') {
            const csvContent = utils.generateCSVFile(selectedPapers);
            const filename = `generative-ai-papers-${timestamp}.csv`;
            utils.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
            utils.showNotification(`Downloaded ${selectedPapers.length} papers as CSV`, 'success');
        } else if (format === 'ris') {
            const risContent = utils.generateRISFile(selectedPapers);
            const filename = `generative-ai-papers-${timestamp}.ris`;
            utils.downloadFile(risContent, filename, 'application/x-research-info-systems;charset=utf-8;');
            utils.showNotification(`Downloaded ${selectedPapers.length} papers as RIS`, 'success');
        }
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    uiManager.init();
    
    // Configurar auto-refresh cada 24 horas
    const lastUpdate = localStorage.getItem('livingReview_lastUpdate');
    if (!lastUpdate || (Date.now() - new Date(lastUpdate).getTime()) > 24 * 60 * 60 * 1000) {
        setTimeout(() => uiManager.refreshData(), 2000);
    }
});

// ===== EXPORTAR PARA USO GLOBAL =====
window.uiManager = uiManager;
window.dataManager = dataManager;
window.apiService = apiService; 
