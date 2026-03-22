// Photo file extensions mapping
const photoExtensions = {};

// Parse CSV to array of objects
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
        });
        return obj;
    });
}

// Get photo URL for product
function getPhotoUrl(artCode) {
    const ext = photoExtensions[artCode] || 'jpeg';
    return `photo/${artCode}_Фото Товара_Л.${ext}`;
}

// Create product card HTML
function createProductCard(product) {
    const productUrl = `https://magnit.ru/product/${product.art_code}?shopCode=694420&shopType=express`;
    const photoUrl = getPhotoUrl(product.art_code);
    const isAdtech = product.is_adtech === 'True';
    const hasRating = product.rating_value && product.rating_value !== '';

    return `
        <a href="${productUrl}" target="_blank" rel="noopener" class="product-card">
            <div class="product-image-container">
                <span class="position-badge">${product.position}</span>
                <img
                    src="${photoUrl}"
                    alt="${product.product_name}"
                    class="product-image"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div class="placeholder-image" style="display:none;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
                ${isAdtech ? '<span class="adtech-badge">Adtech</span>' : ''}
            </div>
            <div class="product-info">
                <div class="product-name">${product.product_name}</div>
                ${hasRating ? `
                    <div class="product-rating">
                        <span class="star-icon">★</span>
                        <span class="rating-value">${product.rating_value}</span>
                    </div>
                ` : ''}
            </div>
        </a>
    `;
}

// Render products to container
function renderProducts(products, containerId, categoryId) {
    const container = document.getElementById(containerId);
    const categoryEl = document.getElementById(categoryId);

    if (products.length > 0) {
        const category = products[0].art_category_level_2_name;
        categoryEl.textContent = category;
    }

    container.innerHTML = products.map(createProductCard).join('');
}

// Load and initialize
async function init() {
    try {
        // Load photo extensions mapping
        const photoResponse = await fetch('photo_extensions.json');
        if (photoResponse.ok) {
            const extensions = await photoResponse.json();
            Object.assign(photoExtensions, extensions);
        }
    } catch (e) {
        console.log('Photo extensions file not found, using default jpeg');
    }

    try {
        // Load CSV files
        const [currentResponse, newResponse] = await Promise.all([
            fetch('data/current_model.csv'),
            fetch('data/new_model.csv')
        ]);

        const currentCSV = await currentResponse.text();
        const newCSV = await newResponse.text();

        const currentProducts = parseCSV(currentCSV);
        const newProducts = parseCSV(newCSV);

        renderProducts(currentProducts, 'current-products', 'current-category');
        renderProducts(newProducts, 'new-products', 'new-category');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
