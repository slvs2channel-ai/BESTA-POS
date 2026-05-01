// Initialize Dexie DB
const db = new Dexie("MobileShopDB");

// Define schema
db.version(1).stores({
    products: '++id, name, imei, category, retailPrice, wholesalePrice, stock, buyingPrice', 
    sales: '++id, date, customerId, customerType, totalAmount, discount, paymentMethod, status, items', 
    customers: '++id, name, phone'
});

db.version(2).stores({
    products: '++id, name, imei, category, retailPrice, wholesalePrice, stock, buyingPrice', 
    sales: '++id, date, customerId, customerType, totalAmount, discount, paymentMethod, status, items', 
    customers: '++id, name, phone',
    expenses: '++id, date, amount, category, description'
});

// Helper function to show toasts
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-blue-50';
    const borderColor = type === 'success' ? 'border-green-200' : type === 'error' ? 'border-red-200' : 'border-blue-200';
    const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';
    const iconColor = type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-blue-500';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-xmark' : 'fa-info-circle';

    toast.className = `flex items-center gap-3 p-4 rounded-xl border shadow-lg toast-enter ${bgColor} ${borderColor}`;
    
    toast.innerHTML = `
        <i class="fa-solid ${icon} ${iconColor} text-xl"></i>
        <p class="font-medium text-sm ${textColor}">${message}</p>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('toast-enter-active'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('toast-enter-active');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
