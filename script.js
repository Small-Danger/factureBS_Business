// Configuration par défaut
const DEFAULT_CONFIG = {
    company: {
        name: "Votre Entreprise",
        phone: "",
        address: "",
        email: "",
        website: ""
    },
    logo: null,
    currency: 'XOF'
};

const CURRENCIES = {
    XOF: {
        code: 'XOF',
        symbol: 'FCFA',
        name: 'Franc CFA',
        decimals: 0
    },
    MAD: {
        code: 'MAD',
        symbol: 'MAD',
        name: 'Dirham marocain',
        decimals: 2
    }
};

// Variables globales
let articleCount = 1;
let invoiceCounter = 1;
let currentTab = 'client';
let currentCurrency = DEFAULT_CONFIG.currency;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSettings();
    initializeEventListeners();
    updatePreview();
});

// Initialiser l'application
function initializeApp() {
    // Charger les paramètres depuis localStorage
    loadSettings();
    
    // Initialiser les onglets
    initializeTabs();
    
    // Mettre à jour l'aperçu et le résumé
    updatePreview();
    updateArticlesSummary();
}

// Charger les paramètres depuis localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('invoiceSettings');
    let settings = {};

    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings) || {};
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            settings = {};
        }
    }

    if (settings.company) {
        document.getElementById('companyName').value = settings.company.name || '';
        document.getElementById('companyPhone').value = settings.company.phone || '';
        document.getElementById('companyAddress').value = settings.company.address || '';
        document.getElementById('companyEmail').value = settings.company.email || '';
        document.getElementById('companyWebsite').value = settings.company.website || '';
    }

    if (settings.logo) {
        document.getElementById('logoPreview').src = settings.logo;
        document.getElementById('logoPreview').style.display = 'block';
        document.getElementById('logoPreview').classList.add('has-logo');
    }

    currentCurrency = settings.currency || DEFAULT_CONFIG.currency;

    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
        currencySelect.value = currentCurrency;
    }

    applyCurrencyToUI();
}

function getCurrencyConfig(code = currentCurrency) {
    return CURRENCIES[code] || CURRENCIES[DEFAULT_CONFIG.currency];
}

function applyCurrencyToUI() {
    const currency = getCurrencyConfig();
    
    document.querySelectorAll('[data-currency-symbol]').forEach(element => {
        element.textContent = currency.symbol;
    });
    
    refreshArticleTotals();
    updatePreview();
    updateArticlesSummary();
}

function refreshArticleTotals() {
    const articleRows = document.querySelectorAll('.article-row');
    
    articleRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.article-quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.article-price')?.value) || 0;
        const totalSpan = row.querySelector('.article-total');
        
        if (totalSpan) {
            totalSpan.textContent = formatPrice(quantity * price);
        }
    });
}

// Sauvegarder les paramètres dans localStorage
function saveSettings() {
    const settings = {
        company: {
            name: document.getElementById('companyName').value,
            phone: document.getElementById('companyPhone').value,
            address: document.getElementById('companyAddress').value,
            email: document.getElementById('companyEmail').value,
            website: document.getElementById('companyWebsite').value
        },
        logo: document.getElementById('logoPreview').src || null
    };
    localStorage.setItem('invoiceSettings', JSON.stringify(settings));
}

// Gestionnaires d'événements
function initializeEventListeners() {
    // Boutons d'onglets
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Boutons principaux
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('addArticle').addEventListener('click', addArticle);
    document.getElementById('previewInvoice').addEventListener('click', previewInvoice);
    document.getElementById('generatePDF').addEventListener('click', generatePDF);
    
    // Modal de prévisualisation
    document.getElementById('closePreview').addEventListener('click', closePreviewModal);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreviewModal);
    document.getElementById('downloadFromPreview').addEventListener('click', generatePDF);
    
    // Nouvelles fonctionnalités pour les articles
    document.getElementById('searchArticles').addEventListener('input', searchArticles);
    document.getElementById('sortByName').addEventListener('click', sortArticlesByName);
    document.getElementById('sortByPrice').addEventListener('click', sortArticlesByPrice);
    document.getElementById('duplicateLast').addEventListener('click', duplicateLastArticle);
    document.getElementById('clearAll').addEventListener('click', clearAllArticles);
    
    // Modal des paramètres
    document.getElementById('closeSettings').addEventListener('click', closeSettingsModal);
    document.getElementById('cancelSettings').addEventListener('click', closeSettingsModal);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Upload du logo
    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);
    
    // Fermer les modals en cliquant à l'extérieur
    document.getElementById('previewModal').addEventListener('click', function(e) {
        if (e.target === this) closePreviewModal();
    });
    document.getElementById('settingsModal').addEventListener('click', function(e) {
        if (e.target === this) closeSettingsModal();
    });
    
    // Mise à jour en temps réel
    document.getElementById('clientFirstName').addEventListener('input', updatePreview);
    document.getElementById('clientLastName').addEventListener('input', updatePreview);
    document.getElementById('clientPhone').addEventListener('input', updatePreview);
    document.getElementById('amountPaid').addEventListener('input', updatePreview);
    document.getElementById('paymentStatus').addEventListener('change', updatePreview);
    
    // Écouter les changements dans les articles
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('article-name') || 
            e.target.classList.contains('article-quantity') || 
            e.target.classList.contains('article-price')) {
            updatePreview();
        }
    });
}

// Gestion des onglets
function initializeTabs() {
    switchTab('client');
}

function switchTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Activer l'onglet sélectionné
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
}

// Gestion du logo
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Vérifier la taille du fichier (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Le fichier est trop volumineux. Taille maximale: 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const logoPreview = document.getElementById('logoPreview');
            logoPreview.src = e.target.result;
            logoPreview.style.display = 'block';
            logoPreview.classList.add('has-logo');
        };
        reader.readAsDataURL(file);
    }
}

// Gestion des modals
function openSettings() {
    loadSettings();
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
}

// Sauvegarder les paramètres
function saveSettings() {
    // Valider les champs obligatoires
    const companyName = document.getElementById('companyName').value.trim();
    const companyPhone = document.getElementById('companyPhone').value.trim();
    const companyAddress = document.getElementById('companyAddress').value.trim();
    
    if (!companyName) {
        alert('Veuillez saisir le nom de l\'entreprise.');
        document.getElementById('companyName').focus();
        return;
    }
    
    if (!companyPhone) {
        alert('Veuillez saisir le téléphone de l\'entreprise.');
        document.getElementById('companyPhone').focus();
        return;
    }
    
    if (!companyAddress) {
        alert('Veuillez saisir l\'adresse de l\'entreprise.');
        document.getElementById('companyAddress').focus();
        return;
    }
    
    // Sauvegarder les paramètres
    const currencySelect = document.getElementById('currencySelect');
    const selectedCurrency = currencySelect ? currencySelect.value : DEFAULT_CONFIG.currency;

    const settings = {
        company: {
            name: companyName,
            phone: companyPhone,
            address: companyAddress,
            email: document.getElementById('companyEmail').value.trim(),
            website: document.getElementById('companyWebsite').value.trim()
        },
        logo: document.getElementById('logoPreview').src || null,
        currency: selectedCurrency
    };
    
    localStorage.setItem('invoiceSettings', JSON.stringify(settings));
    
    currentCurrency = selectedCurrency;
    applyCurrencyToUI();
    
    // Fermer la modal
    closeSettingsModal();
    
    // Afficher un message de succès
    showSuccessMessage('Paramètres sauvegardés avec succès !');
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
}

// Gestion des articles
function addArticle() {
    const container = document.getElementById('articlesContainer');
    const newArticle = document.createElement('div');
    newArticle.className = 'article-row bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow';
    newArticle.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <!-- Nom de l'article -->
            <div class="lg:col-span-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-tag mr-1 text-blue-500"></i>
                    Nom de l'article *
                </label>
                <input type="text" class="article-name form-input w-full"
                       placeholder="Ex: Consultation marketing" required>
            </div>
            
            <!-- Quantité -->
            <div class="lg:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-hashtag mr-1 text-green-500"></i>
                    Quantité *
                </label>
                <div class="relative">
                    <input type="number" class="article-quantity form-input w-full pr-8"
                           placeholder="1" min="1" required>
                    <div class="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                        <button type="button" class="quantity-btn text-xs text-gray-500 hover:text-blue-500" onclick="adjustQuantity(this, 1)">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button type="button" class="quantity-btn text-xs text-gray-500 hover:text-blue-500" onclick="adjustQuantity(this, -1)">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Prix unitaire -->
            <div class="lg:col-span-3">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-dollar-sign mr-1 text-purple-500"></i>
                    Prix unitaire (<span data-currency-symbol>${getCurrencyConfig().symbol}</span>) *
                </label>
                <input type="number" class="article-price form-input w-full"
                       placeholder="0.00" step="0.01" min="0" required>
            </div>
            
            <!-- Actions -->
            <div class="lg:col-span-1 flex justify-end">
                <button type="button" class="remove-btn text-red-500 hover:text-red-700 p-2"
                        onclick="removeArticle(this)" style="display: none;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <!-- Total calculé -->
        <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Total pour cet article:</span>
                <span class="article-total text-lg font-bold text-blue-600">${formatPrice(0)}</span>
            </div>
        </div>
    `;
    
    container.appendChild(newArticle);
    articleCount++;
    
    // Ajouter les événements
    addArticleEvents(newArticle);
    
    // Afficher le bouton supprimer si plus d'un article
    updateRemoveButtons();
    
    // Mettre à jour la prévisualisation et le résumé
    updatePreview();
    updateArticlesSummary();
    
    // Focus sur le nom de l'article
    const nameInput = newArticle.querySelector('.article-name');
    nameInput.focus();
}

function removeArticle(button) {
    button.closest('.article-row').remove();
    updateRemoveButtons();
    updatePreview();
    updateArticlesSummary();
}

// Ajuster la quantité avec les boutons +/-
function adjustQuantity(button, change) {
    const input = button.closest('.relative').querySelector('.article-quantity');
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, currentValue + change);
    input.value = newValue;
    
    // Déclencher l'événement de calcul
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
}

// Mettre à jour le résumé des articles
function updateArticlesSummary() {
    const articles = getArticlesData();
    const totalArticles = articles.length;
    const totalAmount = articles.reduce((sum, article) => sum + article.total, 0);
    
    document.getElementById('totalArticles').textContent = totalArticles;
    document.getElementById('totalAmount').textContent = formatPrice(totalAmount);
    
    // Afficher/masquer le bouton dupliquer
    const duplicateBtn = document.getElementById('duplicateLast');
    if (totalArticles > 0) {
        duplicateBtn.style.display = 'inline-flex';
    } else {
        duplicateBtn.style.display = 'none';
    }
}

// Dupliquer le dernier article
function duplicateLastArticle() {
    const articles = getArticlesData();
    if (articles.length === 0) return;
    
    const lastArticle = articles[articles.length - 1];
    
    // Ajouter un nouvel article
    addArticle();
    
    // Remplir avec les données du dernier article
    const newArticleRow = document.querySelector('.article-row:last-child');
    const nameInput = newArticleRow.querySelector('.article-name');
    const quantityInput = newArticleRow.querySelector('.article-quantity');
    const priceInput = newArticleRow.querySelector('.article-price');
    
    nameInput.value = lastArticle.name + ' (copie)';
    quantityInput.value = lastArticle.quantity;
    priceInput.value = lastArticle.price;
    
    // Déclencher les événements de calcul
    [nameInput, quantityInput, priceInput].forEach(input => {
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    });
}

// Fonction pour créer des articles de test (pour tester la pagination)
function createTestArticles() {
    if (confirm('Créer 15 articles de test pour vérifier la pagination ?')) {
        const testArticles = [
            { name: 'Consultation marketing digital', quantity: 2, price: 25000 },
            { name: 'Développement site web', quantity: 1, price: 150000 },
            { name: 'Formation SEO', quantity: 3, price: 45000 },
            { name: 'Maintenance serveur', quantity: 1, price: 75000 },
            { name: 'Design logo professionnel', quantity: 1, price: 35000 },
            { name: 'Rédaction contenu web', quantity: 10, price: 5000 },
            { name: 'Audit sécurité informatique', quantity: 1, price: 120000 },
            { name: 'Configuration email professionnel', quantity: 2, price: 25000 },
            { name: 'Formation WordPress', quantity: 4, price: 30000 },
            { name: 'Optimisation base de données', quantity: 1, price: 80000 },
            { name: 'Intégration API tierces', quantity: 3, price: 40000 },
            { name: 'Sauvegarde automatique', quantity: 1, price: 15000 },
            { name: 'Monitoring 24/7', quantity: 1, price: 60000 },
            { name: 'Support technique', quantity: 5, price: 20000 },
            { name: 'Migration données', quantity: 1, price: 90000 }
        ];
        
        // Effacer les articles existants
        clearAllArticles();
        
        // Ajouter tous les articles de test
        testArticles.forEach(articleData => {
            addArticle();
            
            const newArticleRow = document.querySelector('.article-row:last-child');
            const nameInput = newArticleRow.querySelector('.article-name');
            const quantityInput = newArticleRow.querySelector('.article-quantity');
            const priceInput = newArticleRow.querySelector('.article-price');
            
            nameInput.value = articleData.name;
            quantityInput.value = articleData.quantity;
            priceInput.value = articleData.price;
            
            // Déclencher les événements de calcul
            [nameInput, quantityInput, priceInput].forEach(input => {
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            });
        });
        
        showSuccessMessage('15 articles de test créés ! Vous pouvez maintenant tester la pagination PDF.');
    }
}

// Effacer tous les articles
function clearAllArticles() {
    if (confirm('Êtes-vous sûr de vouloir effacer tous les articles ?')) {
        const container = document.getElementById('articlesContainer');
        container.innerHTML = '';
        
        // Ajouter un article par défaut
        addArticle();
        
        updatePreview();
        updateArticlesSummary();
    }
}

// Rechercher dans les articles
function searchArticles() {
    const searchTerm = document.getElementById('searchArticles').value.toLowerCase();
    const articleRows = document.querySelectorAll('.article-row');
    
    articleRows.forEach(row => {
        const nameInput = row.querySelector('.article-name');
        const articleName = nameInput.value.toLowerCase();
        
        if (articleName.includes(searchTerm)) {
            row.style.display = 'block';
        } else {
            row.style.display = 'none';
        }
    });
}

// Trier les articles par nom
function sortArticlesByName() {
    const container = document.getElementById('articlesContainer');
    const articles = Array.from(container.children);
    
    articles.sort((a, b) => {
        const nameA = a.querySelector('.article-name').value.toLowerCase();
        const nameB = b.querySelector('.article-name').value.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    articles.forEach(article => container.appendChild(article));
}

// Trier les articles par prix
function sortArticlesByPrice() {
    const container = document.getElementById('articlesContainer');
    const articles = Array.from(container.children);
    
    articles.sort((a, b) => {
        const priceA = parseFloat(a.querySelector('.article-price').value) || 0;
        const priceB = parseFloat(b.querySelector('.article-price').value) || 0;
        return priceB - priceA; // Décroissant
    });
    
    articles.forEach(article => container.appendChild(article));
}

// Ajouter les événements à un article
function addArticleEvents(articleRow) {
    const nameInput = articleRow.querySelector('.article-name');
    const quantityInput = articleRow.querySelector('.article-quantity');
    const priceInput = articleRow.querySelector('.article-price');
    const totalSpan = articleRow.querySelector('.article-total');
    
    // Fonction pour calculer le total de cet article
    function calculateArticleTotal() {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const total = quantity * price;
        
        if (totalSpan) {
            totalSpan.textContent = formatPrice(total);
        }
        
        // Mettre à jour la prévisualisation et le résumé
        updatePreview();
        updateArticlesSummary();
    }
    
    // Événements sur les inputs
    [nameInput, quantityInput, priceInput].forEach(input => {
        input.addEventListener('input', calculateArticleTotal);
        input.addEventListener('blur', calculateArticleTotal);
    });
    
    // Calcul initial
    calculateArticleTotal();
}

function updateRemoveButtons() {
    const articles = document.querySelectorAll('.article-row');
    const removeButtons = document.querySelectorAll('.remove-btn');
    
    removeButtons.forEach(button => {
        button.style.display = articles.length > 1 ? 'block' : 'none';
    });
}

// Obtenir les données des articles
function getArticlesData() {
    const articles = [];
    const articleRows = document.querySelectorAll('.article-row');
    
    articleRows.forEach(row => {
        const name = row.querySelector('.article-name').value.trim();
        const quantity = parseFloat(row.querySelector('.article-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.article-price').value) || 0;
        
        if (name && quantity > 0 && price >= 0) {
            articles.push({
                name: name,
                quantity: quantity,
                price: price,
                total: quantity * price
            });
        }
    });
    
    return articles;
}

// Mettre à jour l'aperçu
function updatePreview() {
    updateClientInfo();
    updateArticlesList();
    updateCalculations();
}

function updateClientInfo() {
    const firstName = document.getElementById('clientFirstName').value || '';
    const lastName = document.getElementById('clientLastName').value || '';
    const phone = document.getElementById('clientPhone').value || '';
    
    const fullName = `${firstName} ${lastName}`.trim() || '-';
    
    document.getElementById('previewClientName').textContent = fullName;
    document.getElementById('previewClientPhone').textContent = phone || '-';
}

function updateArticlesList() {
    const articles = getArticlesData();
    const previewContainer = document.getElementById('previewArticles');
    
    if (articles.length === 0) {
        previewContainer.innerHTML = '<p class="text-gray-500 italic">Aucun article ajouté</p>';
        return;
    }
    
    let html = '';
    articles.forEach((article, index) => {
        const total = article.quantity * article.price;
        html += `
            <div class="bg-white p-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="font-medium text-gray-800">${article.name}</p>
                        <p class="text-sm text-gray-600">Qté: ${article.quantity} × ${formatPrice(article.price)}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-gray-900">${formatPrice(total)}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    previewContainer.innerHTML = html;
}

function updateCalculations() {
    const articles = getArticlesData();
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    
    const subtotal = articles.reduce((sum, article) => sum + article.total, 0);
    const remaining = Math.max(0, subtotal - amountPaid);
    
    document.getElementById('subtotal').textContent = formatPrice(subtotal);
    document.getElementById('paidAmount').textContent = formatPrice(amountPaid);
    document.getElementById('remainingAmount').textContent = formatPrice(remaining);
    
    // Mettre à jour le statut
    updatePaymentStatus(subtotal, amountPaid);
}

function updatePaymentStatus(subtotal, amountPaid) {
    const statusBadge = document.getElementById('statusBadge');
    let statusClass, statusText, statusIcon;
    
    if (amountPaid === 0) {
        statusClass = 'status-pending';
        statusText = 'En attente de paiement';
        statusIcon = 'fas fa-clock';
    } else if (amountPaid >= subtotal) {
        statusClass = 'status-paid';
        statusText = 'Entièrement payé';
        statusIcon = 'fas fa-check-circle';
    } else {
        statusClass = 'status-partial';
        statusText = 'Paiement partiel';
        statusIcon = 'fas fa-exclamation-triangle';
    }
    
    statusBadge.innerHTML = `
        <span class="${statusClass}">
            <i class="${statusIcon} mr-2"></i>
            ${statusText}
        </span>
    `;
}

// Formater le prix
function formatPrice(amount) {
    const currency = getCurrencyConfig();
    const decimals = typeof currency.decimals === 'number' ? currency.decimals : 0;
    const value = Number.isFinite(amount) ? amount : 0;
    
    const formatted = value.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: false
    });
    
    return `${formatted} ${currency.symbol}`;
}

// Prévisualiser la facture
function previewInvoice() {
    if (!validateForm()) {
        return;
    }
    
    const invoiceData = getInvoiceData();
    const previewHTML = generateInvoiceHTML(invoiceData);
    
    document.getElementById('invoicePreview').innerHTML = previewHTML;
    document.getElementById('previewModal').classList.remove('hidden');
}

// Obtenir les données de la facture
function getInvoiceData() {
    const settings = JSON.parse(localStorage.getItem('invoiceSettings') || '{}');
    const currency = getCurrencyConfig(settings.currency || currentCurrency);
    
    return {
        company: settings.company || DEFAULT_CONFIG.company,
        logo: settings.logo,
        client: {
            firstName: document.getElementById('clientFirstName').value,
            lastName: document.getElementById('clientLastName').value,
            phone: document.getElementById('clientPhone').value
        },
        articles: getArticlesData(),
        payment: {
            amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
            status: document.getElementById('paymentStatus').value
        },
        currency: {
            code: currency.code,
            symbol: currency.symbol,
            name: currency.name
        }
    };
}

// Générer le HTML de la facture
function generateInvoiceHTML(data) {
    const articles = data.articles;
    const subtotal = articles.reduce((sum, article) => sum + article.total, 0);
    const remaining = Math.max(0, subtotal - data.payment.amountPaid);
    const currentDate = new Date().toLocaleDateString('fr-FR');
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`;
    
    return `
        <div class="max-w-4xl mx-auto bg-white shadow-2xl" style="font-family: 'Arial', sans-serif;">
            <!-- En-tête professionnel -->
            <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8">
                <div class="flex items-start justify-between">
                    <div class="flex items-start">
                        ${data.logo ? `
                            <div class="bg-white p-3 rounded-lg mr-6 shadow-lg">
                                <img src="${data.logo}" alt="Logo" class="w-20 h-20 object-contain">
                            </div>
                        ` : `
                            <div class="bg-white p-3 rounded-lg mr-6 shadow-lg">
                                <div class="w-20 h-20 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                                    <span class="text-2xl font-bold">${data.company.name.charAt(0)}</span>
                                </div>
                            </div>
                        `}
                        <div class="mt-2">
                            <h1 class="text-3xl font-bold mb-2">${data.company.name}</h1>
                            <div class="space-y-1 text-blue-100">
                                <p class="text-sm"><i class="fas fa-map-marker-alt mr-2"></i>${data.company.address}</p>
                                <p class="text-sm"><i class="fas fa-phone mr-2"></i>${data.company.phone}</p>
                                ${data.company.email ? `<p class="text-sm"><i class="fas fa-envelope mr-2"></i>${data.company.email}</p>` : ''}
                                ${data.company.website ? `<p class="text-sm"><i class="fas fa-globe mr-2"></i>${data.company.website}</p>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <h2 class="text-4xl font-bold mb-4">FACTURE</h2>
                        <div class="bg-white bg-opacity-20 p-4 rounded-lg">
                            <p class="text-lg font-semibold">N° ${invoiceNumber}</p>
                            <p class="text-sm">Date: ${currentDate}</p>
                            <p class="text-sm mt-1">Devise: ${data.currency.name} (${data.currency.symbol})</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Informations client -->
            <div class="p-8 bg-gray-50">
                <h3 class="text-xl font-bold text-blue-600 mb-4 flex items-center">
                    <i class="fas fa-user mr-2"></i>
                    FACTURÉ À:
                </h3>
                <div class="bg-white p-6 rounded-lg border-l-4 border-blue-500 shadow-sm">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                            <p class="text-gray-700 mb-2"><strong class="text-gray-900">Nom complet:</strong></p>
                            <p class="text-lg font-semibold text-gray-900">${data.client.firstName} ${data.client.lastName}</p>
                    </div>
                    <div>
                            <p class="text-gray-700 mb-2"><strong class="text-gray-900">Téléphone:</strong></p>
                            <p class="text-lg text-gray-900">${data.client.phone}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tableau des articles professionnel -->
            <div class="px-8 pb-8">
                <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <i class="fas fa-shopping-cart mr-2"></i>
                    DÉTAILS DE LA COMMANDE
                </h3>
                <div class="overflow-hidden rounded-xl shadow-2xl border border-gray-200">
                    <table class="w-full border-collapse">
                    <thead>
                            <tr class="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <th class="p-5 text-left font-bold text-sm uppercase tracking-wider">Désignation du produit/service</th>
                                <th class="p-5 text-center font-bold text-sm uppercase tracking-wider w-24">Quantité</th>
                                <th class="p-5 text-right font-bold text-sm uppercase tracking-wider w-32">Prix unitaire</th>
                                <th class="p-5 text-right font-bold text-sm uppercase tracking-wider w-32">Sous-total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${articles.map((article, index) => `
                                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200">
                                    <td class="p-5">
                                        <div class="font-semibold text-gray-900 text-base">${article.name}</div>
                                    </td>
                                    <td class="p-5 text-center">
                                        <span class="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                                            ${article.quantity}
                                        </span>
                                    </td>
                                    <td class="p-5 text-right font-semibold text-gray-900 text-base">
                                        ${formatPrice(article.price)}
                                    </td>
                                    <td class="p-5 text-right font-bold text-gray-900 text-base">
                                        ${formatPrice(article.total)}
                                    </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                </div>
            </div>
            
            <!-- Récapitulatif professionnel -->
            <div class="px-8 pb-8">
                <div class="flex justify-end">
                    <div class="bg-gradient-to-r from-gray-50 to-blue-50 p-8 rounded-xl border-l-4 border-blue-500 shadow-lg w-96">
                        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <i class="fas fa-calculator mr-2"></i>
                            RÉCAPITULATIF
                        </h3>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center py-2">
                                <span class="text-gray-600 font-medium">Sous-total:</span>
                                <span class="font-bold text-gray-900 text-lg">${formatPrice(subtotal)}</span>
                            </div>
                            <div class="flex justify-between items-center py-2">
                                <span class="text-gray-600 font-medium">Montant payé:</span>
                                <span class="font-bold text-green-600 text-lg">${formatPrice(data.payment.amountPaid)}</span>
                            </div>
                            <hr class="border-gray-300 my-4">
                            <div class="flex justify-between items-center py-3 bg-blue-600 text-white px-4 rounded-lg">
                                <span class="font-bold text-lg">RESTE À PAYER:</span>
                                <span class="font-bold text-xl">${formatPrice(remaining)}</span>
                            </div>
                        </div>
                        ${data.payment.status === 'paid' ? `
                            <div class="mt-6 text-center">
                                <div class="inline-flex items-center justify-center w-24 h-24 bg-green-500 text-white rounded-full text-xl font-bold shadow-lg">
                                    <i class="fas fa-check mr-2"></i>
                                    PAYÉ
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Pied de page professionnel -->
            <div class="bg-gray-900 text-white p-8">
                <div class="text-center">
                    <h4 class="text-xl font-bold mb-2">Merci pour votre confiance !</h4>
                    <p class="text-gray-300 mb-4">${data.company.name}</p>
                    <div class="border-t border-gray-700 pt-4">
                        <p class="text-sm text-gray-400">Conditions générales de vente disponibles sur demande</p>
                        <p class="text-sm text-gray-400 mt-1">Pour toute question, contactez-nous au ${data.company.phone}</p>
                    </div>
            </div>
            </div>
        </div>
    `;
}

// Générer le PDF
function generatePDF() {
    if (!validateForm()) {
        return;
    }
    
    const invoiceData = getInvoiceData();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuration de la page A4
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Couleurs
    const primaryBlue = [37, 99, 235];
    const darkBlue = [29, 78, 216];
    const lightGray = [249, 250, 251];
    
    let yPosition = 20;
    let currentPage = 1;
    
    // Fonction pour vérifier si on a besoin d'une nouvelle page
    function checkNewPage(requiredSpace = 20) {
        // Obtenir la position actuelle sur la page
        const currentPageInfo = doc.internal.getCurrentPageInfo();
        const currentY = doc.internal.getCurrentPageInfo().pageNumber === 1 ? yPosition : yPosition;
        
        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition + requiredSpace > pageHeight - 50) {
            doc.addPage();
            currentPage++;
            yPosition = 50; // Position après l'en-tête
            
            // Ajouter l'en-tête sur chaque nouvelle page
            doc.setFillColor(...primaryBlue);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            // Logo sur chaque page
            if (invoiceData.logo) {
                try {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(20, 10, 30, 30, 'F');
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(1);
                    doc.rect(20, 10, 30, 30);
                    doc.addImage(invoiceData.logo, 'PNG', 25, 15, 20, 20);
                } catch (e) {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(20, 10, 30, 30, 'F');
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(1);
                    doc.rect(20, 10, 30, 30);
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...primaryBlue);
                    doc.text(invoiceData.company.name.charAt(0), 35, 28, { align: 'center' });
                }
            }
            
            // Nom de l'entreprise
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(invoiceData.company.name, 60, 20);
            
            // Titre FACTURE
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('FACTURE', pageWidth - 20, 20, { align: 'right' });
            
            // Numéro de facture
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`;
            doc.text(`N° ${invoiceNumber}`, pageWidth - 20, 28, { align: 'right' });
            
            // Date
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(255, 255, 255);
            const currentDate = new Date().toLocaleDateString('fr-FR');
            doc.text(`Date: ${currentDate}`, pageWidth - 20, 34, { align: 'right' });
            doc.text(`Devise: ${invoiceData.currency.name} (${invoiceData.currency.symbol})`, pageWidth - 20, 40, { align: 'right' });
            
            // Ligne de séparation
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1);
            doc.line(0, 38, pageWidth, 38);
        }
        
        return yPosition;
    }
    
    // === EN-TÊTE CORPORATE PROFESSIONNEL ===
    // Fond bleu corporate
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Logo professionnel
    if (invoiceData.logo) {
        try {
            // Conteneur blanc carré pour le logo
            doc.setFillColor(255, 255, 255);
            doc.rect(20, 15, 40, 40, 'F');
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(1);
            doc.rect(20, 15, 40, 40);
            doc.addImage(invoiceData.logo, 'PNG', 25, 20, 30, 30);
        } catch (e) {
            console.log('Erreur ajout logo:', e);
            // Logo textuel simple
            doc.setFillColor(255, 255, 255);
            doc.rect(20, 15, 40, 40, 'F');
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(1);
            doc.rect(20, 15, 40, 40);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryBlue);
            doc.text(invoiceData.company.name.charAt(0), 40, 38, { align: 'center' });
        }
    } else {
        // Logo textuel simple
        doc.setFillColor(255, 255, 255);
        doc.rect(20, 15, 40, 40, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(20, 15, 40, 40);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryBlue);
        doc.text(invoiceData.company.name.charAt(0), 40, 38, { align: 'center' });
    }
    
    // Nom de l'entreprise
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(invoiceData.company.name, 75, 25);
    
    // Informations de contact
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(`Adresse: ${invoiceData.company.address}`, 75, 35);
    doc.text(`Tel: ${invoiceData.company.phone}`, 75, 40);
    if (invoiceData.company.email) {
        doc.text(`Email: ${invoiceData.company.email}`, 75, 45);
    }
    if (invoiceData.company.website) {
        doc.text(`Site: ${invoiceData.company.website}`, 75, 50);
    }
    
    // Section FACTURE
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FACTURE', pageWidth - 20, 25, { align: 'right' });
    
    // Numéro de facture
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`;
    doc.text(`N° ${invoiceNumber}`, pageWidth - 20, 35, { align: 'right' });
    
    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.text(`Date: ${currentDate}`, pageWidth - 20, 42, { align: 'right' });
    doc.text(`Devise: ${invoiceData.currency.name} (${invoiceData.currency.symbol})`, pageWidth - 20, 49, { align: 'right' });
    
    // Ligne de séparation
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.line(0, 58, pageWidth, 58);
    
    // === INFORMATIONS CLIENT ===
    yPosition = 75;
    
    // Titre section client
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryBlue);
    doc.text('FACTURE A:', 20, yPosition);
    
    // Conteneur client
    doc.setFillColor(248, 250, 252);
    doc.rect(20, yPosition + 5, pageWidth - 40, 35, 'F');
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(3);
    doc.line(20, yPosition + 5, 20, yPosition + 40);
    
    yPosition += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Nom complet:', 30, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoiceData.client.firstName} ${invoiceData.client.lastName}`, 30, yPosition + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Telephone:', 30, yPosition + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.client.phone, 30, yPosition + 18);
    
    // === TABLEAU DES ARTICLES ===
    yPosition += 45;
    const finalYPosition = drawArticlesTable(doc, invoiceData.articles, yPosition, pageWidth, checkNewPage);
    
    // === RÉCAPITULATIF PROFESSIONNEL ===
    const articles = invoiceData.articles;
    const subtotal = articles.reduce((sum, article) => sum + article.total, 0);
    const remaining = Math.max(0, subtotal - invoiceData.payment.amountPaid);
    
    // Position après le tableau - utiliser la position retournée par drawArticlesTable
    let summaryY = finalYPosition + 20;
    
    // Vérifier si on a besoin d'une nouvelle page pour le récapitulatif
    checkNewPage(40);
    
    // Si on a changé de page, repositionner le récapitulatif
    const currentPageInfo = doc.internal.getCurrentPageInfo();
    if (currentPageInfo.pageNumber > 1) {
        summaryY = 100; // Position sur nouvelle page
    }
    
    // Conteneur récapitulatif - positionné en dessous du tableau
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth - 100, summaryY - 10, 80, 35, 'F');
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(3);
    doc.line(pageWidth - 100, summaryY - 10, pageWidth - 100, summaryY + 25);
    
    // Titre récapitulatif
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RECAPITULATIF', pageWidth - 95, summaryY - 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Ligne sous-total
    doc.text('Sous-total:', pageWidth - 95, summaryY + 3);
    doc.text(formatPrice(subtotal), pageWidth - 15, summaryY + 3, { align: 'right' });
    
    // Ligne montant payé
    doc.text('Montant payé:', pageWidth - 95, summaryY + 8);
    doc.text(formatPrice(invoiceData.payment.amountPaid), pageWidth - 15, summaryY + 8, { align: 'right' });
    
    // Ligne reste à payer (en gras et bleu)
    doc.setFillColor(37, 99, 235);
    doc.rect(pageWidth - 100, summaryY + 12, 80, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('RESTE A PAYER:', pageWidth - 95, summaryY + 17);
    doc.text(formatPrice(remaining), pageWidth - 15, summaryY + 17, { align: 'right' });
    
    // === PIED DE PAGE ===
    const footerY = pageHeight - 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Merci pour votre confiance – ${invoiceData.company.name}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text('Conditions générales de vente disponibles sur demande', pageWidth / 2, footerY + 6, { align: 'center' });
    
    // === TÉLÉCHARGER LE PDF ===
    const cleanClientName = `${invoiceData.client.firstName}_${invoiceData.client.lastName}`.replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `Facture_${cleanClientName}_${invoiceNumber}.pdf`;
    doc.save(fileName);
    
    // Incrémenter le compteur
    invoiceCounter++;
    
    // Fermer la modal si elle est ouverte
    closePreviewModal();
    
    // Message de succès
    showSuccessMessage();
}

// Dessiner le tableau des articles
function drawArticlesTable(doc, articles, startY, pageWidth, checkNewPage) {
    let y = startY;
    let currentPage = 1;
    
    // Fonction pour dessiner l'en-tête du tableau
    function drawTableHeader(doc, pageWidth, y) {
        // En-tête du tableau avec dégradé
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        
        // Fond bleu dégradé pour l'en-tête
        doc.setFillColor(37, 99, 235);
        doc.rect(20, y - 10, pageWidth - 40, 12, 'F');
        
        // Bordures épaisses
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(2);
        doc.rect(20, y - 10, pageWidth - 40, 12);
        
        // En-têtes des colonnes en majuscules
        doc.text('DESIGNATION', 25, y);
        doc.text('QTÉ', 100, y);
        doc.text('PRIX UNIT.', 130, y);
        doc.text('TOTAL', pageWidth - 25, y, { align: 'right' });
        
        return y + 12;
    }
    
    // Titre section articles
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DETAILS DE LA COMMANDE', 20, y);
    y += 12;
    
    // Dessiner l'en-tête du tableau
    y = drawTableHeader(doc, pageWidth, y);
    
    // Articles avec design amélioré
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    articles.forEach((article, index) => {
        // Vérifier si on a besoin d'une nouvelle page pour cet article
        // On laisse 40px de marge en bas pour le récapitulatif
        if (checkNewPage) {
            checkNewPage(15);
        }
        
        // Si on a changé de page, redessiner l'en-tête du tableau
        if (currentPage !== doc.internal.getCurrentPageInfo().pageNumber) {
            currentPage = doc.internal.getCurrentPageInfo().pageNumber;
            y = 60; // Position après l'en-tête de page
            y = drawTableHeader(doc, pageWidth, y);
        }
        
        // Fond alterné plus visible
        if (index % 2 === 0) {
            doc.setFillColor(255, 255, 255);
            doc.rect(20, y - 10, pageWidth - 40, 12, 'F');
        } else {
            doc.setFillColor(248, 250, 252);
            doc.rect(20, y - 10, pageWidth - 40, 12, 'F');
        }
        
        // Bordures visibles
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(20, y - 10, pageWidth - 40, 12);
        
        // Contenu avec styles améliorés
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        
        // Gérer les noms d'articles trop longs
        let articleName = article.name;
        if (articleName.length > 35) {
            articleName = articleName.substring(0, 32) + '...';
        }
        doc.text(articleName, 25, y);
        
        // Quantité simple
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(article.quantity.toString(), 100, y);
        
        // Prix et total
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatPrice(article.price), 130, y);
        doc.text(formatPrice(article.total), pageWidth - 25, y, { align: 'right' });
        
        y += 12;
    });
    
    return y;
}

// Valider le formulaire
function validateForm() {
    const firstName = document.getElementById('clientFirstName').value.trim();
    const lastName = document.getElementById('clientLastName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const articles = getArticlesData();
    
    if (!firstName) {
        alert('Veuillez saisir le prénom du client.');
        document.getElementById('clientFirstName').focus();
        return false;
    }
    
    if (!lastName) {
        alert('Veuillez saisir le nom du client.');
        document.getElementById('clientLastName').focus();
        return false;
    }
    
    if (!phone) {
        alert('Veuillez saisir le numéro de téléphone du client.');
        document.getElementById('clientPhone').focus();
        return false;
    }
    
    if (articles.length === 0) {
        alert('Veuillez ajouter au moins un article.');
        return false;
    }
    
    return true;
}

// Afficher un message de succès
function showSuccessMessage(message = 'Facture générée avec succès !') {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}
