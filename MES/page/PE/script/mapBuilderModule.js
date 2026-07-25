const MapBuilderModule = (function () {
    let canvas = null;
    let currentMode = 'select';
    let isBuilderMode = false;

    // Drawing state
    let isDrawing = false;
    let origX, origY;
    let currentShape = null;
    let polyPoints = [];
    let activePolyShape = null;
    let snapToGrid = false;
    const gridSize = 50;
    let gridLines = [];
    let systemLocations = [];

    function init() {
        if (typeof fabric === 'undefined') {
            console.error('Fabric.js is not loaded. Map Builder cannot initialize.');
            return;
        }

        // Fetch locations for binding
        fetchLocations();

        // Initialize Fabric canvas
        const canvasEl = document.getElementById('iiotMapCanvas');
        if (!canvasEl) return;

        const container = document.getElementById('iiotPanzoomElement');
        const img = document.getElementById('iiotFloorplanImg');
        let w = img ? (img.naturalWidth || img.clientWidth) : (container.clientWidth || 800);
        let h = img ? (img.naturalHeight || img.clientHeight) : (container.clientHeight || 600);
        
        // Ensure minimum size if image is not loaded yet
        w = w || 800;
        h = h || 600;

        // Use intrinsic image dimensions
        canvas = new fabric.Canvas('iiotMapCanvas', {
            width: w,
            height: h,
            selection: true
        });

        // Resize when image is fully loaded
        if (img && !img.complete) {
            img.addEventListener('load', () => {
                const nw = img.naturalWidth || img.clientWidth;
                const nh = img.naturalHeight || img.clientHeight;
                if (nw && nh && canvas) {
                    canvas.setWidth(nw);
                    canvas.setHeight(nh);
                    canvas.setDimensions({ width: '100%', height: '100%' }, { cssOnly: true });
                    canvas.calcOffset();
                    canvas.renderAll();
                }
            });
        }

        // Event listeners for drawing
        canvas.on('mouse:down', onMouseDown);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);
        canvas.on('mouse:dblclick', onMouseDblClick);
        canvas.on('selection:created', onObjectSelected);
        canvas.on('selection:updated', onObjectSelected);
        canvas.on('selection:cleared', onSelectionCleared);

        canvas.on('object:moving', (o) => {
            if (snapToGrid) {
                o.target.set({
                    left: Math.round(o.target.left / gridSize) * gridSize,
                    top: Math.round(o.target.top / gridSize) * gridSize
                });
            }
        });

        // Load existing map if any
        loadMap();

        // Make toolbar draggable
        const toolbar = document.getElementById('mapBuilderToolbar');
        if (toolbar) {
            let isDraggingTb = false, tbStartX, tbStartY;
            toolbar.style.cursor = 'move';
            toolbar.onmousedown = (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'I') {
                    isDraggingTb = true;
                    tbStartX = e.clientX - toolbar.offsetLeft;
                    tbStartY = e.clientY - toolbar.offsetTop;
                }
            };
            document.addEventListener('mousemove', (e) => {
                if (isDraggingTb) {
                    toolbar.style.left = (e.clientX - tbStartX) + 'px';
                    toolbar.style.top = (e.clientY - tbStartY) + 'px';
                }
            });
            document.addEventListener('mouseup', () => isDraggingTb = false);
        }

        // Key down to finish polygon
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === 'Escape') && currentMode === 'poly') {
                finishPolygon();
            }
        });

        window.addEventListener('resize', () => {
            if (isBuilderMode && canvas) {
                canvas.calcOffset(); // Just re-calculate pointer offset on resize
            }
        });
        
        animateConveyors(); // Start conveyor animation
    }

    function toggleMode() {
        isBuilderMode = !isBuilderMode;

        const toolbar = document.getElementById('mapBuilderToolbar');
        const nodesContainer = document.getElementById('mapNodesContainer');
        const canvasWrapper = document.getElementById('mapCanvasWrapper');
        const btnToggle = document.getElementById('iiotMapBuilderBtn');

        if (isBuilderMode) {
            toolbar.style.display = 'block';
            nodesContainer.style.pointerEvents = 'none'; // Keep visible but unclickable
            nodesContainer.style.opacity = '0.5';
            canvasWrapper.style.pointerEvents = 'auto'; // Enable canvas interactions
            btnToggle.classList.replace('btn-outline-primary', 'btn-primary');

            if (typeof IIoTModule !== 'undefined' && IIoTModule.setPanzoomState) {
                IIoTModule.setPanzoomState(false);
            }

            // Calculate offset in case layout shifted
            canvas.calcOffset();
            canvas.renderAll();
        } else {
            toolbar.style.display = 'none';
            nodesContainer.style.pointerEvents = 'auto'; // Restore pointer events
            nodesContainer.style.opacity = '1';
            canvasWrapper.style.pointerEvents = 'none'; // Disable canvas interactions, let nodes receive clicks
            btnToggle.classList.replace('btn-primary', 'btn-outline-primary');

            if (typeof IIoTModule !== 'undefined' && IIoTModule.setPanzoomState) {
                IIoTModule.setPanzoomState(true);
            }

            setMode('select'); // Reset mode
        }
    }

    function setMode(mode) {
        currentMode = mode;
        if (!canvas) return;

        canvas.isDrawingMode = false;

        // Reset poly drawing state if switching modes
        if (mode !== 'poly' && activePolyShape) {
            canvas.remove(activePolyShape);
            activePolyShape = null;
            polyPoints = [];
        }

        // Update button visual states
        ['select', 'line', 'rect', 'poly', 'text', 'conveyor'].forEach(m => {
            let btnId = 'btnDraw' + m.charAt(0).toUpperCase() + m.slice(1);
            if (m === 'poly') btnId = 'btnDrawPoly';
            if (m === 'text') btnId = 'btnDrawText';
            if (m === 'conveyor') btnId = 'btnDrawConveyor';
            const btn = document.getElementById(btnId);
            if (btn) {
                if (m === mode) {
                    btn.classList.replace('btn-outline-light', 'btn-primary');
                    btn.classList.replace('text-start', 'text-start'); // Keep it
                } else {
                    btn.classList.replace('btn-primary', 'btn-outline-light');
                }
            }
        });

        if (mode === 'select') {
            canvas.selection = true;
            canvas.getObjects().forEach(o => {
                o.selectable = true;
                o.evented = true;
            });
        } else {
            canvas.selection = false;
            canvas.getObjects().forEach(o => {
                o.selectable = false;
                o.evented = false;
            });
        }
    }

    function deleteSelected() {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }
    }

    function drawGridLines() {
        if (!canvas) return;
        gridLines.forEach(l => canvas.remove(l));
        gridLines = [];
        if (snapToGrid) {
            const w = canvas.width;
            const h = canvas.height;
            for (let i = 0; i < (w / gridSize); i++) {
                gridLines.push(new fabric.Line([i * gridSize, 0, i * gridSize, h], { stroke: '#475569', strokeWidth: 1, selectable: false, evented: false, opacity: 0.5, isGrid: true }));
                canvas.add(gridLines[gridLines.length - 1]);
            }
            for (let j = 0; j < (h / gridSize); j++) {
                gridLines.push(new fabric.Line([0, j * gridSize, w, j * gridSize], { stroke: '#475569', strokeWidth: 1, selectable: false, evented: false, opacity: 0.5, isGrid: true }));
                canvas.add(gridLines[gridLines.length - 1]);
            }
            gridLines.forEach(l => l.sendToBack());
        }
        canvas.renderAll();
    }

    function toggleSnap(val) {
        snapToGrid = val;
        drawGridLines();
    }

    function getPointerWithSnap(pointer) {
        if (!snapToGrid) return pointer;
        return {
            x: Math.round(pointer.x / gridSize) * gridSize,
            y: Math.round(pointer.y / gridSize) * gridSize
        };
    }

    // --- Drawing Handlers ---
    function onMouseDown(o) {
        if (currentMode === 'select') return;

        isDrawing = true;
        const rawPointer = canvas.getPointer(o.e);
        const pointer = getPointerWithSnap(rawPointer);

        origX = pointer.x;
        origY = pointer.y;

        if (currentMode === 'line') {
            currentShape = new fabric.Line([origX, origY, origX, origY], {
                strokeWidth: 4,
                fill: '#38bdf8',
                stroke: '#38bdf8',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            canvas.add(currentShape);
        } else if (currentMode === 'conveyor') {
            currentShape = new fabric.Line([origX, origY, origX, origY], {
                strokeWidth: 4,
                fill: '#f59e0b',
                stroke: '#f59e0b',
                strokeDashArray: [15, 10],
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                isConveyor: true
            });
            canvas.add(currentShape);
        } else if (currentMode === 'rect') {
            const currentOpacity = document.getElementById('zoneOpacitySlider') ? parseFloat(document.getElementById('zoneOpacitySlider').value) : 0.7;
            currentShape = new fabric.Rect({
                left: origX,
                top: origY,
                originX: 'left',
                originY: 'top',
                width: 0,
                height: 0,
                fill: 'rgba(56, 189, 248, 0.2)',
                stroke: '#38bdf8',
                strokeWidth: 2,
                opacity: currentOpacity,
                selectable: false,
                evented: false,
                zoneName: 'New Zone'
            });
            canvas.add(currentShape);
        } else if (currentMode === 'poly') {
            polyPoints.push({ x: pointer.x, y: pointer.y });
            if (polyPoints.length === 1) {
                const currentOpacity = document.getElementById('zoneOpacitySlider') ? parseFloat(document.getElementById('zoneOpacitySlider').value) : 0.7;
                activePolyShape = new fabric.Polygon([...polyPoints], {
                    fill: 'rgba(56, 189, 248, 0.2)',
                    stroke: '#38bdf8',
                    strokeWidth: 2,
                    opacity: currentOpacity,
                    selectable: false,
                    evented: false,
                    zoneName: 'New Zone'
                });
                canvas.add(activePolyShape);
            } else {
                activePolyShape.set({ points: [...polyPoints] });
                activePolyShape._calcDimensions();
                activePolyShape.setCoords();
            }
            canvas.renderAll();
            isDrawing = false; // poly does not drag-to-draw
        } else if (currentMode === 'text') {
            const text = new fabric.IText('New Label', {
                left: origX,
                top: origY,
                fontFamily: 'Inter',
                fontSize: 20,
                fill: '#f8fafc',
                selectable: true,
                evented: true,
                zoneName: 'New Label'
            });
            canvas.add(text);
            setMode('select');
            canvas.setActiveObject(text);
            isDrawing = false;
        }
    }

    function onMouseMove(o) {
        const rawPointer = canvas.getPointer(o.e);
        const pointer = getPointerWithSnap(rawPointer);

        if (currentMode === 'poly' && activePolyShape && polyPoints.length > 0) {
            const tempPoints = [...polyPoints, { x: pointer.x, y: pointer.y }];
            activePolyShape.set({ points: tempPoints });
            activePolyShape._calcDimensions();
            activePolyShape.setCoords();
            canvas.renderAll();
            return;
        }

        if (!isDrawing || currentMode === 'select' || !currentShape) return;

        if (currentMode === 'line' || currentMode === 'conveyor') {
            currentShape.set({ x2: pointer.x, y2: pointer.y });
        } else if (currentMode === 'rect') {
            if (origX > pointer.x) {
                currentShape.set({ left: Math.abs(pointer.x) });
            }
            if (origY > pointer.y) {
                currentShape.set({ top: Math.abs(pointer.y) });
            }

            currentShape.set({ width: Math.abs(origX - pointer.x) });
            currentShape.set({ height: Math.abs(origY - pointer.y) });
        }

        canvas.renderAll();
    }

    function onMouseUp(o) {
        isDrawing = false;
        if (currentShape) {
            currentShape.setCoords();
            currentShape = null;
        }
    }

    function onMouseDblClick(o) {
        if (currentMode === 'poly') {
            finishPolygon();
        }
    }

    function finishPolygon() {
        if (currentMode === 'poly' && polyPoints.length > 2) {
            // Finish polygon
            const currentOpacity = document.getElementById('zoneOpacitySlider') ? parseFloat(document.getElementById('zoneOpacitySlider').value) : 0.7;
            const newPoly = new fabric.Polygon([...polyPoints], {
                fill: 'rgba(56, 189, 248, 0.2)',
                stroke: '#38bdf8',
                strokeWidth: 2,
                opacity: currentOpacity,
                selectable: true,
                evented: true,
                zoneName: 'New Zone' // custom property for analytics
            });
            canvas.add(newPoly);
            if (activePolyShape) canvas.remove(activePolyShape);
            activePolyShape = null;
            polyPoints = [];
            setMode('select');
            canvas.setActiveObject(newPoly);
            canvas.renderAll();
        } else if (currentMode === 'poly') {
            // Cancel drawing if too few points
            if (activePolyShape) canvas.remove(activePolyShape);
            activePolyShape = null;
            polyPoints = [];
            setMode('select');
            canvas.renderAll();
        }
    }

    // --- Object Selection & Properties ---
    function onObjectSelected(o) {
        const obj = o.selected[0];
        if (!obj) return;
        const panel = document.getElementById('objProperties');
        const input = document.getElementById('objNameInput');
        const locGroup = document.getElementById('objLocationGroup');
        const locSelect = document.getElementById('objLocationSelect');
        
        if (panel && input) {
            panel.style.display = 'block';
            if (obj.type === 'i-text') {
                input.value = obj.text || '';
                if (locGroup) locGroup.style.display = 'none';
            } else {
                input.value = obj.zoneName || '';
                if (locGroup) locGroup.style.display = 'block';
                if (locSelect) locSelect.value = obj.location_id || '';
            }
        }
    }

    function onSelectionCleared() {
        const panel = document.getElementById('objProperties');
        if (panel) panel.style.display = 'none';
    }

    function updateObjName(val) {
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) {
            if (obj.type === 'i-text') {
                obj.set('text', val);
            } else {
                obj.zoneName = val;
            }
            canvas.renderAll();
        }
    }

    function updateObjLocation(val) {
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.location_id = val;
            canvas.renderAll();
        }
    }

    async function fetchLocations() {
        try {
            const res = await fetch('api/mapAPI.php?action=get_locations');
            const text = await res.text();
            try {
                const json = JSON.parse(text);
                if (json.success) {
                    systemLocations = json.data;
                    const locSelect = document.getElementById('objLocationSelect');
                    if (locSelect) {
                        locSelect.innerHTML = '<option value="">-- No Location --</option>';
                        systemLocations.forEach(loc => {
                            const opt = document.createElement('option');
                            opt.value = loc.location_id;
                            opt.textContent = `${loc.location_name} ${loc.production_line ? '('+loc.production_line+')' : ''}`;
                            locSelect.appendChild(opt);
                        });
                    }
                }
            } catch(err) {
                console.error("JSON parse error from locations API. Raw text:", text);
            }
        } catch (e) {
            console.error('Failed to load locations', e);
        }
    }

    async function createLocationFromZone() {
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (!obj || !obj.zoneName) {
            PEApp.showToast('Please enter a Zone Name first.', 'warning');
            return;
        }

        const confirmMsg = `Create a new Location in the system using the name "${obj.zoneName}"?`;
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Create Location',
                text: confirmMsg,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, create it!'
            });
            if (!result.isConfirmed) return;
        } else {
            if (!confirm(confirmMsg)) return;
        }

        try {
            const res = await PEApp.apiCall('api/mapAPI.php', {}, 'POST', {
                action: 'save_location',
                location_name: obj.zoneName,
                location_type: 'WIP'
            });

            if (res.success) {
                PEApp.showToast('Location created successfully!', 'success');
                await fetchLocations();
                
                // Try to find the newly created location to auto-bind
                const newLoc = systemLocations.find(l => l.location_name === obj.zoneName);
                if (newLoc) {
                    obj.location_id = newLoc.location_id;
                    const locSelect = document.getElementById('objLocationSelect');
                    if (locSelect) locSelect.value = obj.location_id;
                }
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            PEApp.showToast('Failed to create location: ' + e.message, 'error');
        }
    }

    // --- Background Tracing ---
    function uploadTracingImage(input) {
        if (!input.files || !input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                clearTracing(); // remove existing if any
                const currentOpacity = document.getElementById('tracingOpacitySlider') ? document.getElementById('tracingOpacitySlider').value : 0.5;
                img.set({
                    left: 0,
                    top: 0,
                    opacity: parseFloat(currentOpacity),
                    selectable: false,
                    evented: false,
                    isTracingImage: true,
                    excludeFromExport: true
                });
                
                // Scale to fit canvas width
                img.scaleToWidth(canvas.width);
                canvas.add(img);
                img.sendToBack(); // push behind lines
                
                // Ensure grid lines stay behind the tracing image if grid is enabled
                if (snapToGrid) drawGridLines(); 
                
                canvas.renderAll();
            });
        };
        reader.readAsDataURL(input.files[0]);
    }

    function alignSelected(direction) {
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length < 2) return;
        
        canvas.discardActiveObject(); // Temporarily ungroup to calculate absolute positions

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        activeObjects.forEach(obj => {
            const bound = obj.getBoundingRect(true, true);
            if (bound.left < minX) minX = bound.left;
            if (bound.top < minY) minY = bound.top;
            if (bound.left + bound.width > maxX) maxX = bound.left + bound.width;
            if (bound.top + bound.height > maxY) maxY = bound.top + bound.height;
        });

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        activeObjects.forEach(obj => {
            const bound = obj.getBoundingRect(true, true);
            let targetLeft = obj.left;
            let targetTop = obj.top;
            
            // Adjust based on object origin
            let oX = obj.originX === 'center' ? bound.width / 2 : 0;
            let oY = obj.originY === 'center' ? bound.height / 2 : 0;

            switch (direction) {
                case 'left': targetLeft = minX + oX; break;
                case 'right': targetLeft = maxX - bound.width + oX; break;
                case 'center': targetLeft = centerX - bound.width / 2 + oX; break;
                case 'top': targetTop = minY + oY; break;
                case 'bottom': targetTop = maxY - bound.height + oY; break;
                case 'middle': targetTop = centerY - bound.height / 2 + oY; break;
            }
            obj.set({ left: targetLeft, top: targetTop });
            obj.setCoords();
        });
        
        const sel = new fabric.ActiveSelection(activeObjects, { canvas: canvas });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
    }

    let conveyorAnimReq = null;
    function animateConveyors() {
        if (!canvas) {
            conveyorAnimReq = requestAnimationFrame(animateConveyors);
            return;
        }
        let renderNeeded = false;
        canvas.getObjects().forEach(obj => {
            // Treat as conveyor if explicitly flagged, or if it's a line with dash array [15,10]
            const isDashArrayConveyor = obj.type === 'line' && obj.strokeDashArray && obj.strokeDashArray[0] === 15;
            if (obj.isConveyor || isDashArrayConveyor) {
                // Ensure isConveyor is set so it gets saved correctly next time
                obj.isConveyor = true;
                let offset = obj.strokeDashOffset || 0;
                offset -= 1; // speed of conveyor
                if (offset <= -25) offset = 0;
                obj.set('strokeDashOffset', offset);
                renderNeeded = true;
            }
        });
        if (renderNeeded) canvas.renderAll();
        conveyorAnimReq = requestAnimationFrame(animateConveyors);
    }

    function changeTracingOpacity(val) {
        if (!canvas) return;
        const objects = canvas.getObjects();
        const tracingImg = objects.find(o => o.type === 'image' && o.isTracingImage);
        if (tracingImg) {
            tracingImg.set('opacity', parseFloat(val));
            canvas.renderAll();
        }
    }
    
    function changeMapOpacity(val) {
        const img = document.getElementById('iiotFloorplanImg');
        if (img) img.style.opacity = val;
    }

    function changeZoneOpacity(val) {
        if (!canvas) return;
        canvas.getObjects().forEach(obj => {
            if (obj.type === 'rect' || obj.type === 'polygon') {
                obj.set('opacity', parseFloat(val));
            }
        });
        canvas.renderAll();
    }

    function clearTracing() {
        if (!canvas) return;
        const objects = canvas.getObjects();
        const tracingImg = objects.find(o => o.type === 'image' && o.isTracingImage);
        if (tracingImg) {
            canvas.remove(tracingImg);
            canvas.renderAll();
        }
        const uploadEl = document.getElementById('mapTracingUpload');
        if (uploadEl) uploadEl.value = '';
    }

    // --- Layer Management ---
    function toggleLayer(layerType, isVisible) {
        if (layerType === 'machine') {
            const nodes = document.querySelectorAll('.machine-node');
            nodes.forEach(n => {
                n.style.display = isVisible ? 'block' : 'none';
            });
            const tooltips = document.querySelectorAll('.machine-tooltip');
            tooltips.forEach(t => {
                t.style.display = 'none'; // always hide tooltip on toggle
            });
        } else {
            if (!canvas) return;
            canvas.getObjects().forEach(obj => {
                if (layerType === 'line' && obj.type === 'line') obj.visible = isVisible;
                if (layerType === 'zone' && (obj.type === 'rect' || obj.type === 'polygon')) obj.visible = isVisible;
                if (layerType === 'text' && obj.type === 'i-text') obj.visible = isVisible;
            });
            canvas.renderAll();
        }
    }

    // --- Save & Load ---
    async function saveMap(areaId) {
        try {
            // Include custom properties in JSON export
            const json = canvas.toJSON(['zoneName', 'location_id', 'id', 'name', 'isConveyor']);
            const finalAreaId = areaId || (document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1);
            const res = await PEApp.apiCall('mapAPI.php', {}, 'POST', {
                action: 'save_map',
                area_id: finalAreaId,
                map_data: JSON.stringify(json)
            });

            if (res.success) {
                PEApp.showToast('Vector map saved successfully!', 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            PEApp.showToast('Failed to save map: ' + e.message, 'error');
        }
    }

    async function loadMap(areaId) {
        try {
            const finalAreaId = areaId || (document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1);
            const res = await PEApp.apiCall('mapAPI.php', { action: 'load_map', area_id: finalAreaId });
            if (res.success && res.map_data) {
                canvas.loadFromJSON(res.map_data, canvas.renderAll.bind(canvas));
            }
        } catch (e) {
            console.log("No existing vector map found or failed to load.", e);
        }
    }

    // Provide a way for IIoTModule to force resize/render
    function forceRender() {
        if (canvas) {
            const container = document.getElementById('iiotPanzoomElement');
            if (container) {
                canvas.setWidth(container.clientWidth);
                canvas.setHeight(container.clientHeight);
                canvas.renderAll();
            }
        }
    }

    return {
        init,
        toggleMode,
        setMode,
        deleteSelected,
        saveMap,
        uploadTracingImage,
        changeTracingOpacity,
        changeZoneOpacity,
        changeMapOpacity,
        clearTracing,
        toggleLayer,
        updateObjName,
        updateObjLocation,
        createLocationFromZone,
        forceRender,
        toggleSnap,
        alignSelected,
        loadMap,
        isModeActive: () => isBuilderMode,
        getCanvas: () => canvas,
        getLocations: () => systemLocations
    };
})();

// Initialize when tab is shown
document.addEventListener('DOMContentLoaded', () => {
    // Check if we need to init immediately, otherwise we let PEApp or the Tab click handle it
    setTimeout(() => {
        MapBuilderModule.init();
    }, 1000); // Small delay to ensure DOM is fully rendered
});

window.MapBuilderModule = MapBuilderModule;
export default MapBuilderModule;
