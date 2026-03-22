// Data storage
let currentProducts = [];
let newProducts = [];
let activeModel = 'current';

// Parse CSV (handles commas in quoted fields)
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const products = [];
    const seenPositions = new Set();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });

        // Deduplicate by position
        if (!seenPositions.has(obj.position)) {
            seenPositions.add(obj.position);
            products.push(obj);
        }
    }

    return products;
}

// Format price
function formatPrice(price) {
    if (!price) return null;
    return Math.round(parseFloat(price));
}

// Format rating
function formatRating(rating) {
    if (!rating) return null;
    const num = parseFloat(rating);
    return num % 1 === 0 ? Math.round(num) : num;
}

// Calculate discount
function calcDiscount(price, actionPrice) {
    if (!price || !actionPrice) return null;
    const p = parseFloat(price);
    const ap = parseFloat(actionPrice);
    if (p <= ap) return null;
    return Math.round((1 - ap / p) * 100);
}

// Create product card HTML
function createProductCard(product) {
    const productUrl = product.link || `https://magnit.ru/product/${product.art_code}`;
    const imageUrl = product.image || '';
    const isAdtech = product.is_adtech === 'True';
    const hasRating = product.rating_value && product.rating_value !== '';

    const price = formatPrice(product.base_price);
    const actionPrice = formatPrice(product.action_price);
    const hasDiscount = price && actionPrice && actionPrice < price;
    const discount = calcDiscount(product.base_price, product.action_price);
    const rating = formatRating(product.rating_value);
    const displayPrice = actionPrice || price;

    let priceHtml = '';
    if (displayPrice) {
        priceHtml = `
            <div class="price-block">
                <div class="price-row">
                    <span class="current-price${hasDiscount ? ' has-discount' : ''}">${displayPrice}<span class="currency">₽</span></span>
                    ${hasDiscount ? `<span class="discount-percent">-${discount}%</span>` : ''}
                </div>
                ${hasDiscount ? `<div class="old-price">${price} ₽</div>` : ''}
            </div>
        `;
    }

    return `
        <a href="${productUrl}" target="_blank" rel="noopener" class="product-card">
            <div class="product-image-wrap">
                ${isAdtech ? '<span class="promo-badge">Промокод: РУБЛЬ</span>' : ''}
                <button class="favorite-btn" onclick="event.preventDefault(); event.stopPropagation();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                ${imageUrl ? `
                    <img
                        src="${imageUrl}"
                        alt="${product.product_name}"
                        class="product-image"
                        loading="lazy"
                        onerror="this.style.display='none'; this.parentElement.querySelector('.placeholder-image').style.display='flex';"
                    >
                ` : ''}
                <div class="placeholder-image" style="${imageUrl ? 'display:none;' : 'display:flex;'}">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
            </div>
            <div class="product-info">
                ${priceHtml}
                <div class="product-name">${product.product_name}</div>
                ${hasRating ? `
                    <div class="product-rating">
                        <span class="star-icon">★</span>
                        <span class="rating-value">${rating}</span>
                    </div>
                ` : '<div class="product-rating" style="visibility:hidden"><span>★</span><span>0</span></div>'}
                <button class="cart-btn" onclick="event.preventDefault(); event.stopPropagation();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    В корзину
                </button>
            </div>
        </a>
    `;
}

// Render products
function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('total-count');
    const categoryEl = document.getElementById('category-name');

    if (products.length > 0 && products[0].art_category_level_2_name) {
        categoryEl.textContent = products[0].art_category_level_2_name;
    }

    countEl.textContent = products.length;
    grid.innerHTML = products.map(createProductCard).join('');
}

// Switch model
function switchModel(model) {
    activeModel = model;

    // Update tabs
    document.querySelectorAll('.model-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.model === model) {
            tab.classList.add('active');
        }
    });

    // Render products
    const products = model === 'current' ? currentProducts : newProducts;
    renderProducts(products);
}

// Initialize
async function init() {
    try {
        const [currentResponse, newResponse] = await Promise.all([
            fetch('data/current_model.csv'),
            fetch('data/new_model.csv')
        ]);

        const currentCSV = await currentResponse.text();
        const newCSV = await newResponse.text();

        currentProducts = parseCSV(currentCSV);
        newProducts = parseCSV(newCSV);

        // Setup tabs
        document.querySelectorAll('.model-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchModel(tab.dataset.model);
            });
        });

        // Initial render
        renderProducts(currentProducts);

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);
