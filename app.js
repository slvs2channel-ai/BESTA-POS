// ==========================================
// GOOGLE DRIVE API GLOBALS
// ==========================================
// TODO: Replace these with your actual Google Cloud credentials
const GOOGLE_CLIENT_ID = '992936012147-vrba8ign6i541ag0jtkligl0v0ocs95f.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyDz3grJsOwzi9ltxCmNMqUPOfljKB0c7b8';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let accessToken = null;

// Called when Google API script loads
window.gapiLoadOkay = function () {
    gapi.load('client', async () => {
        try {
            await gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            window.dispatchEvent(new Event('googleAuthReady'));
        } catch (e) {
            console.error("Error initializing GAPI client", e);
        }
    });
};

// Called when Google Identity Services script loads
window.gisLoadOkay = function () {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later in app.js
    });
    gisInited = true;
    window.dispatchEvent(new Event('googleAuthReady'));
};

document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentPricingMode = 'retail'; // 'retail' or 'wholesale'
    let cart = [];
    let currentCategoryFilter = 'all';

    // --- UI Elements ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');
    const currentTimeEl = document.getElementById('current-time');

    // --- Clock ---
    setInterval(() => {
        const now = new Date();
        currentTimeEl.textContent = now.toLocaleTimeString();
    }, 1000);

    // --- Navigation Logic ---
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');

            // Update active button
            navBtns.forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white', 'border-l-4', 'border-brand-500');
                b.classList.add('text-slate-300');
            });
            btn.classList.remove('text-slate-300');
            btn.classList.add('bg-slate-800', 'text-white', 'border-l-4', 'border-brand-500');

            // Update title
            pageTitle.textContent = btn.textContent.trim();

            // Switch views
            viewSections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('active');
            });
            document.getElementById(`view-${target}`).classList.remove('hidden');
            document.getElementById(`view-${target}`).classList.add('active');

            // Load data based on view
            loadViewData(target);
        });
    });

    function loadViewData(target) {
        if (target === 'dashboard') loadDashboard();
        else if (target === 'inventory') loadInventory();
        else if (target === 'pos') loadPOS();
        else if (target === 'sales') loadSalesHistory();
        else if (target === 'customers') loadCustomers();
        else if (target === 'finance') loadFinance();
    }

    // Initialize first view
    loadDashboard();

    // --- Format Currency ---
    const formatCurrency = (amount) => {
        return 'Rs ' + parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // ==========================================
    // INVENTORY MANAGEMENT
    // ==========================================
    const modalProduct = document.getElementById('modal-product');
    const btnAddProduct = document.getElementById('btn-add-product');
    const closeBtns = document.querySelectorAll('.close-modal');
    const formProduct = document.getElementById('form-product');
    const invSearch = document.getElementById('inv-search');

    btnAddProduct.addEventListener('click', () => {
        formProduct.reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('modal-product-title').textContent = 'Add New Product';
        modalProduct.classList.remove('hidden');
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modalProduct.classList.add('hidden');
        });
    });

    formProduct.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const product = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            imei: document.getElementById('prod-imei').value,
            buyingPrice: parseFloat(document.getElementById('prod-buying').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            wholesalePrice: parseFloat(document.getElementById('prod-wholesale').value),
            retailPrice: parseFloat(document.getElementById('prod-retail').value)
        };

        try {
            if (id) {
                await db.products.update(parseInt(id), product);
                showToast('Product updated successfully!');
            } else {
                await db.products.add(product);
                showToast('Product added successfully!');
            }
            modalProduct.classList.add('hidden');
            loadInventory();
            if (document.getElementById('view-pos').classList.contains('active')) loadPOS();
        } catch (error) {
            showToast('Error saving product: ' + error, 'error');
        }
    });

    invSearch.addEventListener('input', () => loadInventory());

    async function loadInventory() {
        const query = invSearch.value.toLowerCase();
        let products;

        if (query) {
            products = await db.products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.imei && p.imei.toLowerCase().includes(query))
            ).toArray();
        } else {
            products = await db.products.toArray();
        }

        const tbody = document.getElementById('inventory-list');
        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-5 py-4 text-center text-gray-500">No products found.</td></tr>`;
            return;
        }

        products.forEach(p => {
            const stockClass = p.stock <= 5 ? 'text-red-600 font-bold bg-red-50 rounded-full px-2 py-1' : 'text-gray-700';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-5 py-4 font-medium text-gray-800">${p.name}</td>
                <td class="px-5 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md border border-gray-200">${p.category}</span></td>
                <td class="px-5 py-4 text-gray-500 text-sm">${p.imei || '-'}</td>
                <td class="px-5 py-4 text-right text-gray-600">${formatCurrency(p.buyingPrice)}</td>
                <td class="px-5 py-4 text-right text-gray-600">${formatCurrency(p.wholesalePrice)}</td>
                <td class="px-5 py-4 text-right text-gray-800 font-medium">${formatCurrency(p.retailPrice)}</td>
                <td class="px-5 py-4 text-center"><span class="${stockClass}">${p.stock}</span></td>
                <td class="px-5 py-4 text-center">
                    <button class="text-blue-500 hover:text-blue-700 mr-3 edit-prod" data-id="${p.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="text-red-500 hover:text-red-700 del-prod" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach events
        document.querySelectorAll('.edit-prod').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const p = await db.products.get(id);
                if (p) {
                    document.getElementById('prod-id').value = p.id;
                    document.getElementById('prod-name').value = p.name;
                    document.getElementById('prod-category').value = p.category;
                    document.getElementById('prod-imei').value = p.imei;
                    document.getElementById('prod-buying').value = p.buyingPrice;
                    document.getElementById('prod-stock').value = p.stock;
                    document.getElementById('prod-wholesale').value = p.wholesalePrice;
                    document.getElementById('prod-retail').value = p.retailPrice;
                    document.getElementById('modal-product-title').textContent = 'Edit Product';
                    modalProduct.classList.remove('hidden');
                }
            });
        });

        document.querySelectorAll('.del-prod').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this product?')) {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    await db.products.delete(id);
                    showToast('Product deleted');
                    loadInventory();
                }
            });
        });
    }


    // ==========================================
    // POS SYSTEM
    // ==========================================
    const posSearch = document.getElementById('pos-search');
    const catBtns = document.querySelectorAll('#pos-categories button');
    const btnTypeRetail = document.getElementById('btn-type-retail');
    const btnTypeWholesale = document.getElementById('btn-type-wholesale');

    btnTypeRetail.addEventListener('click', () => {
        currentPricingMode = 'retail';
        btnTypeRetail.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-brand-500 text-white shadow-sm transition-all';
        btnTypeWholesale.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-700 transition-all';
        renderCart();
    });

    btnTypeWholesale.addEventListener('click', () => {
        currentPricingMode = 'wholesale';
        btnTypeWholesale.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-brand-500 text-white shadow-sm transition-all';
        btnTypeRetail.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-700 transition-all';
        renderCart();
    });

    catBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            catBtns.forEach(b => {
                b.className = 'px-4 py-1.5 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200 whitespace-nowrap hover:bg-gray-100';
            });
            const clicked = e.currentTarget;
            clicked.className = 'px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium border border-brand-200 whitespace-nowrap active-category';
            currentCategoryFilter = clicked.getAttribute('data-cat');
            loadPOS();
        });
    });

    posSearch.addEventListener('input', () => loadPOS());

    async function loadPOS() {
        const query = posSearch.value.toLowerCase();
        let products = await db.products.toArray();

        if (currentCategoryFilter !== 'all') {
            products = products.filter(p => p.category === currentCategoryFilter);
        }
        if (query) {
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.imei && p.imei.toLowerCase().includes(query))
            );
        }

        const container = document.getElementById('pos-product-list');
        container.innerHTML = '';

        if (products.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-400 py-10">No products found.</p>`;
            return;
        }

        products.forEach(p => {
            const outOfStock = p.stock <= 0;
            const price = currentPricingMode === 'retail' ? p.retailPrice : p.wholesalePrice;
            const div = document.createElement('div');
            div.className = `bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${outOfStock ? 'opacity-50 pointer-events-none' : ''}`;
            div.innerHTML = `
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-brand-500 bg-brand-50 px-2 py-0.5 rounded">${p.category}</span>
                    <h4 class="font-semibold text-gray-800 text-sm mt-1 leading-tight line-clamp-2">${p.name}</h4>
                    <p class="text-xs text-gray-400 mt-1">${p.imei ? 'IMEI: ' + p.imei : '&nbsp;'}</p>
                </div>
                <div class="mt-3 flex justify-between items-end">
                    <span class="text-xs ${p.stock <= 5 ? 'text-red-500' : 'text-gray-500'}">Stock: ${p.stock}</span>
                    <span class="font-bold text-gray-800">${formatCurrency(price)}</span>
                </div>
            `;

            if (!outOfStock) {
                div.addEventListener('click', () => addToCart(p));
            }
            container.appendChild(div);
        });
    }

    function addToCart(product) {
        const existing = cart.find(item => item.product.id === product.id);
        if (existing) {
            if (existing.qty < product.stock) {
                existing.qty++;
            } else {
                showToast('Not enough stock!', 'error');
            }
        } else {
            cart.push({ product, qty: 1 });
        }
        renderCart();
    }

    function renderCart() {
        const container = document.getElementById('pos-cart-items');
        container.innerHTML = '';

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                    <i class="fa-solid fa-cart-arrow-down text-4xl mb-2"></i>
                    <p class="text-sm">Cart is empty</p>
                </div>`;
            updateCartTotals();
            return;
        }

        cart.forEach((item, index) => {
            const price = currentPricingMode === 'retail' ? item.product.retailPrice : item.product.wholesalePrice;
            const total = price * item.qty;

            const div = document.createElement('div');
            div.className = 'bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-2';
            div.innerHTML = `
                <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-semibold text-gray-800 truncate">${item.product.name}</h5>
                    <div class="text-xs text-gray-500 mt-0.5">${formatCurrency(price)} x ${item.qty}</div>
                </div>
                <div class="font-semibold text-sm text-gray-800 whitespace-nowrap">${formatCurrency(total)}</div>
                <div class="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
                    <button class="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-600 shadow-sm border border-gray-200 hover:text-red-500 btn-minus" data-idx="${index}">-</button>
                    <span class="w-6 text-center text-xs font-semibold">${item.qty}</span>
                    <button class="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-600 shadow-sm border border-gray-200 hover:text-green-500 btn-plus" data-idx="${index}">+</button>
                </div>
            `;
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                if (cart[idx].qty > 1) {
                    cart[idx].qty--;
                } else {
                    cart.splice(idx, 1);
                }
                renderCart();
            });
        });

        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                if (cart[idx].qty < cart[idx].product.stock) {
                    cart[idx].qty++;
                    renderCart();
                } else {
                    showToast('Max stock reached', 'error');
                }
            });
        });

        updateCartTotals();
    }

    function updateCartTotals() {
        let subtotal = 0;
        cart.forEach(item => {
            const price = currentPricingMode === 'retail' ? item.product.retailPrice : item.product.wholesalePrice;
            subtotal += price * item.qty;
        });

        const discountInput = document.getElementById('pos-discount');
        let discount = parseFloat(discountInput.value) || 0;

        let total = subtotal - discount;
        if (total < 0) total = 0;

        document.getElementById('pos-subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('pos-total').textContent = formatCurrency(total);
    }

    document.getElementById('pos-discount').addEventListener('input', updateCartTotals);

    document.getElementById('btn-clear-cart').addEventListener('click', () => {
        cart = [];
        renderCart();
    });

    document.getElementById('btn-checkout').addEventListener('click', async () => {
        if (cart.length === 0) {
            showToast('Cart is empty', 'error');
            return;
        }

        const customerName = document.getElementById('pos-customer-name').value.trim() || 'Walk-in Customer';
        let subtotal = 0;
        let totalBuyingCost = 0;

        const itemsToSave = cart.map(item => {
            const price = currentPricingMode === 'retail' ? item.product.retailPrice : item.product.wholesalePrice;
            subtotal += price * item.qty;
            totalBuyingCost += item.product.buyingPrice * item.qty;
            return {
                productId: item.product.id,
                name: item.product.name,
                imei: item.product.imei,
                qty: item.qty,
                price: price,
                buyingPrice: item.product.buyingPrice
            };
        });

        const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
        const totalAmount = Math.max(0, subtotal - discount);
        const paymentMethod = document.getElementById('pos-payment-method').value;

        // Save Customer if not walk-in (basic implementation)
        let customerId = null;
        if (customerName !== 'Walk-in Customer') {
            const cust = await db.customers.where('name').equals(customerName).first();
            if (cust) {
                customerId = cust.id;
            } else {
                customerId = await db.customers.add({ name: customerName, phone: '' });
            }
        }

        const sale = {
            date: new Date().toISOString(),
            customerId: customerId,
            customerName: customerName,
            customerType: currentPricingMode,
            totalAmount: totalAmount,
            discount: discount,
            paymentMethod: paymentMethod,
            status: paymentMethod === 'Installment' ? 'Pending' : 'Completed',
            items: itemsToSave,
            profit: totalAmount - totalBuyingCost // Calculate profit!
        };

        try {
            // Update stock
            for (let item of cart) {
                const p = await db.products.get(item.product.id);
                await db.products.update(p.id, { stock: p.stock - item.qty });
            }

            // Save Sale
            const saleId = await db.sales.add(sale);

            showToast('Sale successful!');

            // Print Receipt
            printReceipt(sale, saleId);

            // Reset POS
            cart = [];
            document.getElementById('pos-customer-name').value = '';
            document.getElementById('pos-discount').value = '0';
            renderCart();
            loadPOS();

        } catch (error) {
            showToast('Checkout failed: ' + error, 'error');
        }
    });

    function printReceipt(sale, saleId) {
        const printArea = document.getElementById('print-receipt');
        const date = new Date(sale.date).toLocaleString();

        let itemsHtml = '';
        sale.items.forEach(i => {
            itemsHtml += `
                <tr>
                    <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">
                        ${i.name} ${i.imei ? '<br><small>IMEI:' + i.imei + '</small>' : ''}
                    </td>
                    <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: center;">${i.qty}</td>
                    <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: right;">${i.price.toFixed(2)}</td>
                </tr>
            `;
        });

        printArea.innerHTML = `
            <div style="padding: 10px;">
                <h2 style="text-align: center; margin: 0; font-size: 20px;">besta iPHONES</h2>
                <p style="text-align: center; font-size: 12px; margin: 5px 0;">Kurunegala Road, Narammala<br>Tel: 0769118614</p>
                <hr style="border-top: 1px dashed #000; margin: 10px 0;">
                <p style="font-size: 12px; margin: 2px 0;">Bill No: #INV-${String(saleId).padStart(4, '0')}</p>
                <p style="font-size: 12px; margin: 2px 0;">Date: ${date}</p>
                <p style="font-size: 12px; margin: 2px 0;">Customer: ${sale.customerName}</p>
                <p style="font-size: 12px; margin: 2px 0;">Type: ${sale.customerType.toUpperCase()}</p>
                <hr style="border-top: 1px dashed #000; margin: 10px 0;">
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; border-bottom: 1px solid #000; padding-bottom: 4px;">Item</th>
                            <th style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px;">Qty</th>
                            <th style="text-align: right; border-bottom: 1px solid #000; padding-bottom: 4px;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div style="margin-top: 10px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Subtotal:</span>
                        <span>Rs ${(sale.totalAmount + sale.discount).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Discount:</span>
                        <span>Rs ${sale.discount.toFixed(2)}</span>
                    </div>
                    <hr style="border-top: 1px solid #000; margin: 5px 0;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                        <span>Total:</span>
                        <span>Rs ${sale.totalAmount.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                        <span>Payment:</span>
                        <span>${sale.paymentMethod}</span>
                    </div>
                </div>
                <hr style="border-top: 1px dashed #000; margin: 15px 0 10px 0;">
                <p style="text-align: center; font-size: 12px; margin: 0;">Thank You! Come Again.</p>
            </div>
        `;

        window.print();
    }


    // ==========================================
    // DASHBOARD
    // ==========================================
    async function loadDashboard() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allSales = await db.sales.toArray();
        const todaysSales = allSales.filter(s => new Date(s.date) >= today);

        const totalSalesAmount = todaysSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalProfitAmount = todaysSales.reduce((sum, s) => sum + (s.profit || 0), 0);

        document.getElementById('stat-today-sales').textContent = formatCurrency(totalSalesAmount);
        document.getElementById('stat-today-profit').textContent = formatCurrency(totalProfitAmount);

        const productsCount = await db.products.count();
        document.getElementById('stat-total-products').textContent = productsCount;

        const allProducts = await db.products.toArray();
        const lowStockProducts = allProducts.filter(p => p.stock <= 5);
        document.getElementById('stat-low-stock').textContent = lowStockProducts.length;

        // Render Low Stock Table
        const lsBody = document.getElementById('low-stock-list');
        lsBody.innerHTML = '';
        if (lowStockProducts.length === 0) {
            lsBody.innerHTML = `<tr><td colspan="3" class="px-5 py-4 text-center text-gray-500">No low stock items.</td></tr>`;
        } else {
            lowStockProducts.forEach(p => {
                lsBody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3 font-medium text-gray-800">${p.name}</td>
                        <td class="px-5 py-3 text-gray-500 text-xs">${p.category}</td>
                        <td class="px-5 py-3 text-right text-red-600 font-bold">${p.stock}</td>
                    </tr>
                `;
            });
        }

        // Render Recent Sales Table
        const rsBody = document.getElementById('recent-sales-list');
        rsBody.innerHTML = '';
        const recent = allSales.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        if (recent.length === 0) {
            rsBody.innerHTML = `<tr><td colspan="3" class="px-5 py-4 text-center text-gray-500">No sales yet.</td></tr>`;
        } else {
            recent.forEach(s => {
                rsBody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3 font-medium text-gray-800">#INV-${String(s.id).padStart(4, '0')}</td>
                        <td class="px-5 py-3 text-gray-500 text-xs">${s.customerType}</td>
                        <td class="px-5 py-3 text-right font-semibold text-gray-800">${formatCurrency(s.totalAmount)}</td>
                    </tr>
                `;
            });
        }
    }


    // ==========================================
    // SALES HISTORY
    // ==========================================
    const salesSearch = document.getElementById('sales-search');
    salesSearch.addEventListener('input', () => loadSalesHistory());

    async function loadSalesHistory() {
        const query = salesSearch.value.toLowerCase();
        let sales = await db.sales.toArray();

        // Sort by newest first
        sales.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (query) {
            sales = sales.filter(s =>
                s.customerName.toLowerCase().includes(query) ||
                String(s.id).includes(query)
            );
        }

        const tbody = document.getElementById('sales-history-list');
        tbody.innerHTML = '';

        if (sales.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-5 py-4 text-center text-gray-500">No sales found.</td></tr>`;
            return;
        }

        sales.forEach(s => {
            const dateStr = new Date(s.date).toLocaleString();

            // Format items bought
            let itemsHtml = s.items ? s.items.map(item => `<div class="text-xs text-gray-600">• ${item.name} (x${item.qty})</div>`).join('') : '<div class="text-xs text-gray-400">No items</div>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-5 py-4 font-medium text-gray-800">#INV-${String(s.id).padStart(4, '0')}</td>
                <td class="px-5 py-4 text-gray-500 text-sm">${dateStr}</td>
                <td class="px-5 py-4 text-gray-800">${s.customerName}</td>
                <td class="px-5 py-4">${itemsHtml}</td>
                <td class="px-5 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md uppercase tracking-wider">${s.customerType}</span></td>
                <td class="px-5 py-4 text-gray-500 text-sm">${s.paymentMethod}</td>
                <td class="px-5 py-4 text-right font-semibold text-gray-800">${formatCurrency(s.totalAmount)}</td>
                <td class="px-5 py-4 text-center">
                    <div class="flex items-center justify-center gap-3">
                        <button class="text-brand-600 hover:text-brand-800 print-old-receipt" data-id="${s.id}" title="Print">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button class="text-blue-600 hover:text-blue-800 edit-old-receipt" data-id="${s.id}" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-800 delete-old-receipt" data-id="${s.id}" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.print-old-receipt').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const sale = await db.sales.get(id);
                if (sale) printReceipt(sale, id);
            });
        });

        document.querySelectorAll('.edit-old-receipt').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Editing this bill will load it into the POS and remove the saved bill. Continue?')) {
                    const sale = await db.sales.get(id);
                    if (!sale) return;

                    // Restore stock
                    for (let item of sale.items) {
                        const p = await db.products.get(item.productId);
                        if (p) {
                            await db.products.update(p.id, { stock: p.stock + item.qty });
                        }
                    }

                    // Delete the sale
                    await db.sales.delete(id);

                    // Load into POS
                    cart = [];
                    for (let item of sale.items) {
                        const p = await db.products.get(item.productId);
                        if (p) {
                            cart.push({ product: p, qty: item.qty });
                        } else {
                            // Product might have been deleted, create a temporary one for the cart
                            cart.push({
                                product: {
                                    id: item.productId,
                                    name: item.name,
                                    imei: item.imei,
                                    retailPrice: item.price,
                                    wholesalePrice: item.price,
                                    buyingPrice: item.buyingPrice || 0,
                                    stock: item.qty, // allow checking out this amount
                                    category: 'Deleted Product'
                                },
                                qty: item.qty
                            });
                        }
                    }

                    // Set UI
                    document.getElementById('pos-customer-name').value = sale.customerName !== 'Walk-in Customer' ? sale.customerName : '';
                    document.getElementById('pos-discount').value = sale.discount || 0;
                    document.getElementById('pos-payment-method').value = sale.paymentMethod || 'Cash';

                    if (sale.customerType === 'wholesale') {
                        document.getElementById('btn-type-wholesale').click();
                    } else {
                        document.getElementById('btn-type-retail').click();
                    }

                    // Switch to POS view
                    document.querySelector('.nav-btn[data-target="pos"]').click();
                    renderCart();

                    showToast('Bill loaded for editing.', 'info');
                }
            });
        });

        document.querySelectorAll('.delete-old-receipt').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Are you sure you want to delete this bill? Inventory stock will be restored.')) {
                    const sale = await db.sales.get(id);
                    if (!sale) return;

                    // Restore stock
                    for (let item of sale.items) {
                        const p = await db.products.get(item.productId);
                        if (p) {
                            await db.products.update(p.id, { stock: p.stock + item.qty });
                        }
                    }

                    await db.sales.delete(id);
                    showToast('Bill deleted and stock restored.');
                    loadSalesHistory();
                }
            });
        });
    }

    // ==========================================
    // CUSTOMERS
    // ==========================================
    const custSearch = document.getElementById('customer-search');
    custSearch.addEventListener('input', () => loadCustomers());

    async function loadCustomers() {
        const query = custSearch.value.toLowerCase();
        let customers = await db.customers.toArray();

        if (query) {
            customers = customers.filter(c => c.name.toLowerCase().includes(query));
        }

        const tbody = document.getElementById('customers-list');
        tbody.innerHTML = '';

        if (customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="px-5 py-4 text-center text-gray-500">No customers found.</td></tr>`;
            return;
        }

        customers.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-5 py-4 text-gray-500">#CUST-${String(c.id).padStart(4, '0')}</td>
                <td class="px-5 py-4 font-medium text-gray-800">${c.name}</td>
                <td class="px-5 py-4 text-gray-500">${c.phone || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }


    // ==========================================
    // FINANCE & REPORTS
    // ==========================================
    const formExpense = document.getElementById('form-expense');

    // Set default date for expense form to today
    if (document.getElementById('exp-date')) {
        document.getElementById('exp-date').valueAsDate = new Date();
    }

    formExpense.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('exp-date').value;
        const amount = parseFloat(document.getElementById('exp-amount').value);
        const category = document.getElementById('exp-category').value;
        const description = document.getElementById('exp-desc').value;

        try {
            await db.expenses.add({
                date, amount, category, description
            });
            showToast('Expense added successfully!');
            formExpense.reset();
            document.getElementById('exp-date').valueAsDate = new Date();
            loadFinance();
        } catch (error) {
            showToast('Error saving expense: ' + error, 'error');
        }
    });

    async function loadFinance() {
        const allSales = await db.sales.toArray();
        const allProducts = await db.products.toArray();
        const allExpenses = await db.expenses.toArray();

        // Calculations
        let totalRevenue = 0;
        let totalCOGS = 0;

        allSales.forEach(s => {
            totalRevenue += s.totalAmount;
            s.items.forEach(item => {
                totalCOGS += (item.buyingPrice || 0) * item.qty;
            });
        });

        const grossProfit = totalRevenue - totalCOGS;
        const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = grossProfit - totalExpenses;

        const inventoryValue = allProducts.reduce((sum, p) => sum + (p.buyingPrice * p.stock), 0);

        // Update UI
        document.getElementById('fin-total-revenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('fin-cogs').textContent = formatCurrency(totalCOGS);
        document.getElementById('fin-gross-profit').textContent = formatCurrency(grossProfit);
        document.getElementById('fin-expenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('fin-net-profit').textContent = formatCurrency(netProfit);
        document.getElementById('fin-inventory-value').textContent = formatCurrency(inventoryValue);

        // Update Expenses List
        const tbody = document.getElementById('expenses-list');
        tbody.innerHTML = '';
        allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allExpenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-5 py-4 text-center text-gray-500">No expenses recorded.</td></tr>`;
            return;
        }

        allExpenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-5 py-4 text-gray-500 text-sm">${new Date(e.date).toLocaleDateString()}</td>
                <td class="px-5 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">${e.category}</span></td>
                <td class="px-5 py-4 text-gray-800">${e.description || '-'}</td>
                <td class="px-5 py-4 text-right font-medium text-red-600">${formatCurrency(e.amount)}</td>
                <td class="px-5 py-4 text-center">
                    <button class="text-red-500 hover:text-red-700 del-expense" data-id="${e.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.del-expense').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this expense?')) {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    await db.expenses.delete(id);
                    showToast('Expense deleted');
                    loadFinance();
                }
            });
        });
    }


    // ==========================================
    // BACKUP & RESTORE
    // ==========================================
    document.getElementById('btn-export-db').addEventListener('click', async () => {
        try {
            showToast('Generating backup...', 'info');
            const blob = await db.export();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `besta_iPHONES_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Backup downloaded successfully!');
        } catch (error) {
            showToast('Export failed: ' + error, 'error');
        }
    });

    const fileImport = document.getElementById('file-import-db');
    document.getElementById('btn-import-db').addEventListener('click', () => {
        fileImport.click();
    });

    fileImport.addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        const statusEl = document.getElementById('import-status');

        if (confirm('Are you sure you want to restore from this backup? ALL CURRENT DATA WILL BE REPLACED!')) {
            try {
                statusEl.textContent = 'Restoring...';
                statusEl.className = 'text-sm ml-3 text-blue-500';

                await db.delete(); // Delete old DB
                await db.open();   // Re-open
                await db.import(file); // Import new data

                statusEl.textContent = 'Restore complete! Reloading...';
                statusEl.className = 'text-sm ml-3 text-green-500 font-bold';
                showToast('Restore successful! Reloading...', 'success');

                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                statusEl.textContent = 'Restore failed!';
                statusEl.className = 'text-sm ml-3 text-red-500';
                showToast('Import failed: ' + error, 'error');
                console.error(error);
            }
        }
        e.target.value = ''; // Reset input
    });
    // ==========================================
    // GOOGLE DRIVE SYNC
        // ==========================================
        const btnGdriveLogin = document.getElementById('btn-gdrive-login');
        const btnGdriveBackup = document.getElementById('btn-gdrive-backup');
        const btnGdriveRestore = document.getElementById('btn-gdrive-restore');
        const btnGdriveLogout = document.getElementById('btn-gdrive-logout');
        const gdriveStatus = document.getElementById('gdrive-status');
        const gdriveMessage = document.getElementById('gdrive-message');

        function updateGdriveUI(isLoggedIn) {
            if (isLoggedIn) {
                btnGdriveLogin.classList.add('hidden');
                btnGdriveBackup.classList.remove('hidden');
                btnGdriveRestore.classList.remove('hidden');
                btnGdriveLogout.classList.remove('hidden');
                gdriveStatus.textContent = 'Logged In';
                gdriveStatus.className = 'text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded border border-green-200';
            } else {
                btnGdriveLogin.classList.remove('hidden');
                btnGdriveBackup.classList.add('hidden');
                btnGdriveRestore.classList.add('hidden');
                btnGdriveLogout.classList.add('hidden');
                gdriveStatus.textContent = 'Not Logged In';
                gdriveStatus.className = 'text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200';
                gdriveMessage.textContent = '';
            }
        }

        // Listen for readiness of Google APIs
        window.addEventListener('googleAuthReady', () => {
            if (gapiInited && gisInited) {
                // Check if we already have a valid token (not possible with implicit flow without calling requestAccessToken, but we setup the click handler)
            }
        });

        btnGdriveLogin.addEventListener('click', () => {
            if (GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID_HERE')) {
                alert("Please set your GOOGLE_CLIENT_ID and GOOGLE_API_KEY in js/app.js first!");
                return;
            }

            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                accessToken = resp.access_token;
                gapi.client.setToken({ access_token: resp.access_token });
                showToast('Successfully logged in to Google Drive!', 'success');
                updateGdriveUI(true);
            };

            if (gapi.client.getToken() === null) {
                // Prompt the user to select a Google Account and ask for consent to share their data
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                // Skip display of account chooser and consent dialog for an existing session.
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });

        btnGdriveLogout.addEventListener('click', () => {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token);
                gapi.client.setToken('');
                accessToken = null;
                updateGdriveUI(false);
                showToast('Logged out from Google Drive.');
            }
        });

        // Helper: Find existing backup file in AppData folder
        async function findBackupFile() {
            let response;
            try {
                response = await gapi.client.drive.files.list({
                    spaces: 'appDataFolder',
                    fields: 'nextPageToken, files(id, name)',
                    pageSize: 10
                });
            } catch (err) {
                console.error(err);
                throw new Error("Could not search Google Drive.");
            }

            const files = response.result.files;
            return files.find(f => f.name === 'besta_iphones_backup.json');
        }

        btnGdriveBackup.addEventListener('click', async () => {
            try {
                gdriveMessage.textContent = "Preparing backup...";
                gdriveMessage.className = "block mt-2 text-sm text-blue-600 font-medium";

                // 1. Export DB to Blob
                const blob = await db.export();
                const metadata = {
                    'name': 'besta_iphones_backup.json',
                    'parents': ['appDataFolder']
                };

                // 2. Check if file already exists
                const existingFile = await findBackupFile();

                // 3. Create multipart body
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onload = async function () {
                    const base64Data = reader.result.split(',')[1];
                    const multipartRequestBody =
                        delimiter +
                        'Content-Type: application/json\r\n\r\n' +
                        JSON.stringify(metadata) +
                        delimiter +
                        'Content-Type: application/json\r\n' +
                        'Content-Transfer-Encoding: base64\r\n\r\n' +
                        base64Data +
                        close_delim;

                    let request;
                    gdriveMessage.textContent = "Uploading to Google Drive...";

                    if (existingFile) {
                        // Update existing
                        request = gapi.client.request({
                            'path': '/upload/drive/v3/files/' + existingFile.id,
                            'method': 'PATCH',
                            'params': { 'uploadType': 'multipart' },
                            'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
                            'body': multipartRequestBody
                        });
                    } else {
                        // Create new
                        request = gapi.client.request({
                            'path': '/upload/drive/v3/files',
                            'method': 'POST',
                            'params': { 'uploadType': 'multipart' },
                            'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
                            'body': multipartRequestBody
                        });
                    }

                    request.execute(function (file) {
                        if (file && file.id) {
                            showToast('Backup successfully saved to Google Drive!', 'success');
                            gdriveMessage.textContent = "Last backup: " + new Date().toLocaleString();
                            gdriveMessage.className = "block mt-2 text-sm text-green-700 font-medium";
                        } else {
                            showToast('Failed to save to Google Drive.', 'error');
                            gdriveMessage.textContent = "Backup failed.";
                            gdriveMessage.className = "block mt-2 text-sm text-red-600 font-medium";
                        }
                    });
                };
            } catch (error) {
                console.error(error);
                showToast('Backup error: ' + error.message, 'error');
                gdriveMessage.textContent = "";
            }
        });

        btnGdriveRestore.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to restore from Google Drive? ALL CURRENT DATA WILL BE REPLACED!')) return;

            try {
                gdriveMessage.textContent = "Searching for backup on Google Drive...";
                gdriveMessage.className = "block mt-2 text-sm text-blue-600 font-medium";

                const backupFile = await findBackupFile();
                if (!backupFile) {
                    showToast('No backup found on Google Drive.', 'error');
                    gdriveMessage.textContent = "No backup file found.";
                    gdriveMessage.className = "block mt-2 text-sm text-red-600 font-medium";
                    return;
                }

                gdriveMessage.textContent = "Downloading backup...";

                // Download file content
                const response = await gapi.client.drive.files.get({
                    fileId: backupFile.id,
                    alt: 'media'
                });

                // response.body is the JSON string of the exported database
                const blob = new Blob([response.body], { type: 'application/json' });

                gdriveMessage.textContent = "Restoring database...";

                await db.delete(); // Delete old DB
                await db.open();   // Re-open
                await db.import(blob); // Import new data

                showToast('Restore successful! Reloading...', 'success');
                gdriveMessage.textContent = "Restore complete! Reloading...";
                gdriveMessage.className = "block mt-2 text-sm text-green-700 font-bold";

                setTimeout(() => window.location.reload(), 2000);

            } catch (error) {
                console.error(error);
                showToast('Restore error: ' + error.message, 'error');
                gdriveMessage.textContent = "Restore failed.";
                gdriveMessage.className = "block mt-2 text-sm text-red-600 font-medium";
            }
        });

    });
