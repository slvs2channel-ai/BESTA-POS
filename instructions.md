# 🛒 Mobile Shop POS & Inventory Management System

Me system eka visheshayenma mobile electronics (iPhones & Accessories) wholesale saha retail business ekakata galapena widihata hadapu blueprint ekaki.

---

## 📋 1. Business Requirements (Mona wageda system eken wenna oone?)

### A. Inventory Management (Badu Palanaya)
* **Product Categories:** iPhones (Model, Storage, Color, Battery Health, Warranty) saha Accessories.
* **Pricing Logic:** Retail price saha Wholesale price kiyala dekak thiyenna oone.
* **Stock Tracking:** Badu iwara wenna kittu weddi alert ekak (Low stock alert) enna oone.
* **Serial/IMEI Tracking:** Phone ekaka unique IMEI number eka record karanna puluwan wenna oone.

### B. Sales & Invoicing (Wikinum saha Bill)
* **Dual Mode Billing:** Wholesale customer kenekdatada nathnam Retail customer kenekdatada wikunanne kiyala select karanna puluwan wenna oone.
* **Discounts:** Bill ekata discount ekak denna puluwan wenna oone.
* **Receipt Generation:** Print karanna puluwan bill ekak generate wenna oone.
* **Payment Methods:** Cash, Card, nathnam Installments (thawa gewanna thiyena widihata).

### C. Reporting (Wartawa)
* **Daily/Monthly Profit:** Labaya ganan balanna puluwan dashboard ekak.
* **Sales History:** Issara karapu wikinum gana visthara balanna puluwan wenna oone.

---

## 🛠️ 2. Technical Stack (Mona technology da use karanne?)

* **UI/Design:** HTML5 & Tailwind CSS (Lassanata saha responsive widihata hadaganna).
* **Logic:** Vanilla JavaScript (ES6+).
* **Database:** **Dexie.js** (Browser eke data save karanna - offline weda karanna puluwan).
* **Icons:** Lucide Icons hari FontAwesome hari.

---

## 🏗️ 3. Technical Implementation Instructions (Hadana widiha)

### Step 1: Project Setup
1.  `index.html` file eka hadanna.
2.  Tailwind CSS CDN eka add karaganna.
3.  Dexie.js library eka script tag ekakin add karanna.

### Step 2: Database Schema (Dexie.js)
System eke data save karanna me table structure eka use karanna:
```javascript
const db = new Dexie("MobileShopDB");
db.version(1).stores({
    products: '++id, name, imei, category, retailPrice, wholesalePrice, stock',
    sales: '++id, date, customerType, totalAmount, discount',
    customers: '++id, name, phone'
});