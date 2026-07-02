const MapBuilderModule = (function() {
    let canvas = null;
    let currentMode = 'select';
    let isBuilderMode = false;

    // Drawing state
    let isDrawing = false;
    let origX, origY;
    let currentShape = null;

    function init() {
        if (typeof fabric === 'undefined') {
            console.error('Fabric.js is not loaded. Map Builder cannot initialize.');
            return;
        }

        // Initialize Fabric canvas
        const canvasEl = document.getElementById('iiotMapCanvas');
        if (!canvasEl) return;

        const container = document.getElementById('iiotPanzoomElement');
        const rect = container.getBoundingClientRect();
        
        canvas = new fabric.Canvas('iiotMapCanvas', {
            width: rect.width || 800,
            height: rect.height || 600,
            selection: true
        });

        // Event listeners for drawing
        canvas.on('mouse:down', onMouseDown);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);

        // Load existing map if any
        loadMap();

        // Handle window resize
        window.addEventListener('resize', () => {
            if (isBuilderMode && canvas) {
                const r = container.getBoundingClientRect();
                canvas.setWidth(r.width);
                canvas.setHeight(r.height);
            }
        });
    }

    function toggleMode() {
        isBuilderMode = !isBuilderMode;
        
        const toolbar = document.getElementById('mapBuilderToolbar');
        const nodesContainer = document.getElementById('mapNodesContainer');
        const canvasWrapper = document.getElementById('mapCanvasWrapper');
        const btnToggle = document.getElementById('iiotMapBuilderBtn');

        if (isBuilderMode) {
            toolbar.style.display = 'block';
            nodesContainer.style.display = 'none'; // Hide machine nodes while building
            canvasWrapper.style.pointerEvents = 'auto'; // Enable canvas interactions
            btnToggle.classList.replace('btn-outline-primary', 'btn-primary');
            
            if (typeof IIoTModule !== 'undefined' && IIoTModule.setPanzoomState) {
                IIoTModule.setPanzoomState(false);
            }

            // Adjust canvas size when toggled on
            const container = document.getElementById('iiotPanzoomElement');
            canvas.setWidth(container.clientWidth);
            canvas.setHeight(container.clientHeight);
            canvas.renderAll();
        } else {
            toolbar.style.display = 'none';
            nodesContainer.style.display = 'block';
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
        canvas.isDrawingMode = false;
        
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

    // --- Drawing Handlers ---
    function onMouseDown(o) {
        if (currentMode === 'select') return;
        
        isDrawing = true;
        const pointer = canvas.getPointer(o.e);
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
        } else if (currentMode === 'rect') {
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
                selectable: false,
                evented: false
            });
            canvas.add(currentShape);
        }
    }

    function onMouseMove(o) {
        if (!isDrawing || currentMode === 'select' || !currentShape) return;

        const pointer = canvas.getPointer(o.e);
        
        if (currentMode === 'line') {
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

    // --- Background Tracing ---
    function uploadTracingImage(input) {
        if (!input.files || input.files.length === 0) return;
        
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(f) {
            const imgEl = document.getElementById('iiotFloorplanImg');
            if (imgEl) {
                imgEl.src = f.target.result;
                imgEl.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    function changeTracingOpacity(val) {
        const imgEl = document.getElementById('iiotFloorplanImg');
        if (imgEl) {
            imgEl.style.opacity = val;
        }
    }

    function clearTracing() {
        const imgEl = document.getElementById('iiotFloorplanImg');
        if (imgEl) {
            imgEl.style.display = 'none';
        }
        document.getElementById('mapTracingUpload').value = '';
    }

    // --- Save & Load ---
    async function saveMap() {
        try {
            const json = canvas.toJSON();
            const res = await PEApp.apiCall('mapAPI.php', {}, 'POST', {
                action: 'save_map',
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

    async function loadMap() {
        try {
            const res = await PEApp.apiCall('mapAPI.php', { action: 'load_map' });
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
        uploadTracingImage,
        changeTracingOpacity,
        clearTracing,
        saveMap,
        forceRender
    };
})();

// Initialize when tab is shown
document.addEventListener('DOMContentLoaded', () => {
    // Check if we need to init immediately, otherwise we let PEApp or the Tab click handle it
    setTimeout(() => {
        MapBuilderModule.init();
    }, 1000); // Small delay to ensure DOM is fully rendered
});
