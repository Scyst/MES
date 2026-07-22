# PE Spare Parts Module - Documentation & Roadmap

This document outlines the architecture, features, and recent optimizations made to the PE Spare Parts (Inventory) Module in the MES application.

## 1. Overview
The Spare Parts Module provides a comprehensive view of the maintenance inventory, including stock on-hand, item master data, and transaction history (Receiving/Issuing). It is designed with a modern e-commerce-style UI, allowing users to view items as visually appealing grids (cards) or detailed data tables.

## 2. UI / UX Design
- **Grid View (Default):** Displays items as cards with large product images (250x250px), item codes, names, and current stock levels. Employs a shopping-app aesthetic.
- **Table View:** Provides a compact, data-dense view for quick scanning and sorting.
- **Loading Indicators:** Uses centered Bootstrap Spinners (`spinner-border`) to provide immediate feedback during API data fetching.
- **View Toggle Buttons:** Positioned on the far right of the action bar for consistent layout.

## 3. Image Upload & Processing
The Item Master modal allows users to upload images for spare parts.
- **Drag-and-Drop Interface:** Users can click or drag-and-drop images into a designated 250x250px zone.
- **Client-Side Compression:** Images are compressed on the client side using the HTML5 `<canvas>` element before being uploaded to the server.
  - **Resolution Limit:** Max 800x800 pixels (aspect ratio maintained).
  - **Format & Quality:** Converted to JPEG format at 80% quality.
- **Image Removal:** Users can click a remove (X) button to clear the selected image.

## 4. API & Data Flow
- **API Endpoint:** `sparePartsAPI.php`
- **Key Methods:**
  - `get_onhand`: Fetches current stock levels, joining `MT_ITEMS` with `MT_INVENTORY_ONHAND`. Explicitly selects `i.image_path` to avoid race conditions and ensure images render immediately on page load.
  - `get_available_parts`: Similar to `get_onhand` but filters for `quantity > 0`. Also includes `image_path`.
  - `get_wo_parts`: Retrieves parts issued to specific Work Orders. Includes `image_path`.
- **State Management (`sparePartsModule.js`):** 
  - `allData`: Caches On-Hand data.
  - `allMasterData`: Caches Item Master data.
  - `compressedImageBlob`: Temporarily holds the compressed image binary before form submission.

## 5. Performance Optimizations
- **Lazy Loading Images:** All grid images use the `loading="lazy"` attribute. This defers the loading of off-screen images until the user scrolls near them, preventing the browser from attempting to download hundreds of images simultaneously on initial page load, which drastically improves rendering speed and reduces bandwidth usage.

## 6. Recent Fixes (Changelog)
- **Fix:** Images in the On-Hand tab were not displaying on the initial load because `image_path` was missing from the `get_onhand` SQL query. The frontend fell back to `allMasterData`, which was empty until the Item Master tab was clicked. **Resolution:** Added `i.image_path` to all relevant `SELECT` statements in `sparePartsAPI.php`.
- **Optimization:** Added `loading="lazy"` to `<img>` tags in `sparePartsModule.js` grid templates.
- **UX Improvement:** Replaced static "Loading..." text with centered animated Bootstrap Spinners.
- **Feature:** Added drag-and-drop file upload with preview and canvas compression to the Item Master modal.
