/**
 * Pwint Designer - Custom Print Layout Tool
 * 2025 Pwint.ca. All rights reserved.
 * 
 * This software is mine, don't steal it. :)
 * Pwint® is a registered trademark. For real!
 *  */

const _0x5a7c = [
    'toggleAdminMode',
    'admin1234',  // This is now harder to find in plain text
    'keydown',
    'ctrlKey',
    'altKey',
    'key',
    'a',
    'Delete',
    'removeImage'
];


const DPI = 96; // Pixels Per Inch for conversion
const MAX_CANVAS_DISPLAY_WIDTH = 1200; // Max width for the display canvas in pixels (adjust as needed)
const WATERMARK_TEXT = "PREVIEW - PWINT.CA - Contact us at info@pwint.ca";
const GRID_SNAP_SIZE = 20; // Grid snap size in pixels
const OBJECT_SNAP_THRESHOLD = 10; // Object snap threshold in pixels
const THUMBNAIL_HEIGHT = 180; // Increased height of thumbnails in the carousel
const SCALE_FACTORS = [0.25, 0.5, 0.75, 1, 1.5, 2]; // Scale factors for images

let fabricCanvas; // Fabric.js canvas instance
let currentPaperHeightInches = 24; // This now controls REAL HEIGHT (based on paper type)
let currentPrintWidthInches = 36; // This now controls REAL WIDTH (user input in inches)
let currentMosaicTemplate = null; // Current mosaic template
let gridLines = []; // Grid lines for visual feedback
let snapToGrid = false; // Snap to grid flag
let snapToObjects = true; // Snap to objects flag
let adminMode = false; // Admin mode flag for watermark-free PDFs

// Image management
let stagedImages = {
    portrait: [],   // Array of portrait-oriented images
    landscape: []   // Array of landscape-oriented images
};
let selectedImages = []; // Array of selected image IDs

// --- DOM Elements ---
let paperTypeSelect;
let printWidthInput;
let canvasContainer;
let canvasElement;
let resetButton;
let savePdfButton;
let updateCanvasButton;
let fileErrorMsg;
let loadingIndicator;
let canvasWrapper;
let snapToGridCheckbox;
let snapToObjectsCheckbox;
let applyMosaicButton;
let customGridControls;
let customRowsInput;
let customColsInput;
let dropZone;
let fileInput;
let portraitContainer;
let landscapeContainer;
let autoArrangeBtn;
let clearSelectionBtn;

// Initialize DOM elements after the document is loaded
function initDomElements() {
    paperTypeSelect = document.getElementById('paper-type');
    printWidthInput = document.getElementById('print-length-inches');
    canvasContainer = document.getElementById('canvas-container');
    canvasElement = document.getElementById('print-canvas');
    resetButton = document.getElementById('reset-button');
    savePdfButton = document.getElementById('save-pdf-button');
    updateCanvasButton = document.getElementById('update-canvas-size');
    fileErrorMsg = document.getElementById('file-error');
    loadingIndicator = document.getElementById('loading-indicator');
    canvasWrapper = document.querySelector('.canvas-wrapper');
    snapToGridCheckbox = document.getElementById('snap-to-grid');
    snapToObjectsCheckbox = document.getElementById('snap-to-objects');
    applyMosaicButton = document.getElementById('apply-mosaic');
    customGridControls = document.getElementById('custom-grid-controls');
    customRowsInput = document.getElementById('custom-rows');
    customColsInput = document.getElementById('custom-cols');
    dropZone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');
    portraitContainer = document.getElementById('portrait-container');
    landscapeContainer = document.getElementById('landscape-container');
    autoArrangeBtn = document.getElementById('auto-arrange-btn');
    clearSelectionBtn = document.getElementById('clear-selection-btn');
}

/**
 * Calculates the real print dimensions and the specific display dimensions.
 * Display Height is FIXED based on paper type (2.4" or 4.2").
 * Display Width is based on input width / 10, constrained by screen width.
 * Aspect ratio is NOT preserved in display if width is constrained.
 * @returns {object} { realWidthPx, realHeightPx, displayWidthPx, displayHeightPx }
 */
function calculateCanvasDimensions() {
    // --- Calculate REAL Print Dimensions (for PDF) ---
    const realWidthPx = currentPrintWidthInches * DPI;
    const realHeightPx = currentPaperHeightInches * DPI;

    // --- Calculate TARGET Display Dimensions (in Pixels) based on user rules ---
    // Doubling the display size by using a factor of 5 instead of 10
    const targetDisplayHeightInches = currentPaperHeightInches / 5.0; // Was /10.0
    const targetDisplayWidthInches = currentPrintWidthInches / 5.0;   // Was /10.0

    const targetDisplayHeightPx = targetDisplayHeightInches * DPI;
    const targetDisplayWidthPx = targetDisplayWidthInches * DPI;

    // --- Calculate Final Display Dimensions ---
    // ** Display Height is FIXED based on paper type **
    let displayHeightPx = targetDisplayHeightPx;

    // ** Display Width is calculated, then constrained **
    let displayWidthPx = targetDisplayWidthPx;

    // Get available width constraint
    const parentContainer = document.querySelector('.container');
    const availableWidth = parentContainer?.clientWidth ? parentContainer.clientWidth * 0.95 : document.documentElement.clientWidth * 0.9;
    const maxWidthConstraint = Math.min(MAX_CANVAS_DISPLAY_WIDTH * 2, availableWidth); // Doubled max width

    // Constrain display width if it exceeds the maximum allowed
    displayWidthPx = Math.min(displayWidthPx, maxWidthConstraint);

    // ** Height is NOT recalculated based on constrained width **
    // This ensures height only changes when paper type changes,
    // but may distort the display aspect ratio on narrow screens.

    // Ensure minimum display dimensions
    displayHeightPx = Math.max(60, displayHeightPx); // Min height doubled to 60px (was 30)
    displayWidthPx = Math.max(100, displayWidthPx);  // Min width doubled to 100px (was 50)

    return { realWidthPx, realHeightPx, displayWidthPx, displayHeightPx };
}

/**
 * Updates the Fabric.js canvas size AND the container/wrapper elements explicitly.
 */
function updateCanvasSize() {
    const dims = calculateCanvasDimensions();

    // --- Set Explicit Size on Container, Wrapper, and Canvas ---

    // 1. Set size on the main container (#canvas-container)
    canvasContainer.style.width = `${dims.displayWidthPx}px`;
    canvasContainer.style.height = `${dims.displayHeightPx}px`;

    // 2. Set size on the wrapper (.canvas-wrapper)
    canvasWrapper.style.width = `${dims.displayWidthPx}px`;
    canvasWrapper.style.height = `${dims.displayHeightPx}px`;
    canvasWrapper.style.paddingBottom = ''; // Ensure no padding interferes
    canvasWrapper.style.maxWidth = ''; // Ensure no max-width interferes

    // Apply canvas size class for responsive control sizing
    canvasWrapper.classList.remove('small-canvas', 'medium-canvas', 'large-canvas');
    if (dims.displayWidthPx < 400) {
        canvasWrapper.classList.add('small-canvas');
    } else if (dims.displayWidthPx > 800) {
        canvasWrapper.classList.add('large-canvas');
    } else {
        canvasWrapper.classList.add('medium-canvas');
    }

    // 3. Set Fabric canvas dimensions
    fabricCanvas.setWidth(dims.displayWidthPx);
    fabricCanvas.setHeight(dims.displayHeightPx);

    // 4. Set dimensions on the actual <canvas> element
    canvasElement.width = dims.displayWidthPx;
    canvasElement.height = dims.displayHeightPx;

    // Update control size based on canvas dimensions
    fabric.Object.prototype.cornerSize = Math.max(8, Math.min(14, dims.displayWidthPx / 60));
    fabric.Object.prototype.borderColor = '#e91e63'; // Pwint magenta
    fabric.Object.prototype.cornerColor = '#e91e63'; // Pwint magenta
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerStrokeColor = '#ffffff';

    // Recalculate Fabric's internal offsets
    fabricCanvas.calcOffset();
    // Render all changes
    fabricCanvas.renderAll();

    console.log(`Canvas Updated: Real ${dims.realWidthPx}x${dims.realHeightPx}px | Display ${dims.displayWidthPx.toFixed(1)}x${dims.displayHeightPx.toFixed(1)}px (Height Fixed)`);
}

/**
 * Initializes the Fabric.js canvas.
 */
function initializeCanvas() {
    fabricCanvas = new fabric.Canvas(canvasElement, {
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        skipOffscreen: true,
        renderOnAddRemove: false
    });

    // Get initial dimensions and set size
    currentPaperHeightInches = parseInt(paperTypeSelect.value, 10);
    // Use the new default width
    currentPrintWidthInches = parseFloat(printWidthInput.value);
    updateCanvasSize(); // Set initial size

    // --- Event Listeners for Fabric Objects ---
    fabricCanvas.on('object:moving', preventObjectOverflow);
    fabricCanvas.on('object:scaling', preventObjectOverflow);
    fabricCanvas.on('object:rotating', preventObjectOverflow);

    fabricCanvas.on('object:modified', () => {
        fabricCanvas.requestRenderAll();
    });

    fabricCanvas.on('mouse:down', function(options) {
        if (options.target) {
            fabricCanvas.setActiveObject(options.target);
        }
    });

    fabricCanvas.on('object:added', () => {
        if (!fabricCanvas._renderOnAddRemove) {
            fabricCanvas.requestRenderAll();
        }
    });
}

/**
 * Creates a mosaic grid on the canvas based on template
 * @param {string} template - Template identifier (e.g., '2x2', '3x3', 'custom')
 */
function applyMosaicTemplate(template) {
    // Clear existing grid lines
    clearGridLines();
    
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    
    let rows = 1;
    let cols = 1;
    
    // Parse template string or use custom values
    if (template === 'custom') {
        rows = parseInt(customRowsInput.value, 10) || 2;
        cols = parseInt(customColsInput.value, 10) || 2;
    } else {
        const parts = template.split('x');
        if (parts.length === 2) {
            rows = parseInt(parts[0], 10);
            cols = parseInt(parts[1], 10);
        }
    }
    
    // Enforce reasonable limits
    rows = Math.max(1, Math.min(10, rows));
    cols = Math.max(1, Math.min(10, cols));
    
    // Calculate cell dimensions
    const cellWidth = canvasWidth / cols;
    const cellHeight = canvasHeight / rows;
    
    // Add grid lines
    createGridLines(rows, cols, canvasWidth, canvasHeight);
    
    currentMosaicTemplate = {
        template,
        rows,
        cols,
        cellWidth,
        cellHeight
    };
    
    fabricCanvas.renderAll();
    
    console.log(`Applied mosaic template: ${template} (${rows}x${cols})`);
}

/**
 * Creates grid lines as visual guides
 */
function createGridLines(rows, cols, canvasWidth, canvasHeight) {
    clearGridLines();
    
    const lineOptions = {
        stroke: '#aaaaaa',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5]
    };
    
    // Create vertical lines
    for (let i = 1; i < cols; i++) {
        const x = i * (canvasWidth / cols);
        const line = new fabric.Line([x, 0, x, canvasHeight], lineOptions);
        gridLines.push(line);
        fabricCanvas.add(line);
        fabricCanvas.sendToBack(line);
    }
    
    // Create horizontal lines
    for (let i = 1; i < rows; i++) {
        const y = i * (canvasHeight / rows);
        const line = new fabric.Line([0, y, canvasWidth, y], lineOptions);
        gridLines.push(line);
        fabricCanvas.add(line);
        fabricCanvas.sendToBack(line);
    }
}

/**
 * Clears all grid lines from the canvas
 */
function clearGridLines() {
    if (gridLines.length > 0) {
        gridLines.forEach(line => {
            fabricCanvas.remove(line);
        });
        gridLines = [];
    }
}

/**
 * Snap object to grid or other objects
 * @param {fabric.Object} obj - The object being moved/modified
 */
function snapObjectToTarget(obj) {
    if (!obj) return;
    
    // Get object position and dimensions
    const objX = obj.left;
    const objY = obj.top;
    const objWidth = obj.getScaledWidth();
    const objHeight = obj.getScaledHeight();
    const objRight = objX + objWidth;
    const objBottom = objY + objHeight;
    
    let snapX = objX;
    let snapY = objY;
    let didSnap = false;
    
    // Snap to grid if enabled
    if (snapToGrid && currentMosaicTemplate) {
        const cellWidth = currentMosaicTemplate.cellWidth;
        const cellHeight = currentMosaicTemplate.cellHeight;
        
        // Snap left edge to grid
        const snapLeftX = Math.round(objX / cellWidth) * cellWidth;
        if (Math.abs(objX - snapLeftX) < GRID_SNAP_SIZE) {
            snapX = snapLeftX;
            didSnap = true;
        }
        
        // Snap top edge to grid
        const snapTopY = Math.round(objY / cellHeight) * cellHeight;
        if (Math.abs(objY - snapTopY) < GRID_SNAP_SIZE) {
            snapY = snapTopY;
            didSnap = true;
        }
        
        // Snap right edge to grid
        const objRightSnapX = Math.round(objRight / cellWidth) * cellWidth - objWidth;
        if (Math.abs(objX - objRightSnapX) < GRID_SNAP_SIZE) {
            snapX = objRightSnapX;
            didSnap = true;
        }
        
        // Snap bottom edge to grid
        const objBottomSnapY = Math.round(objBottom / cellHeight) * cellHeight - objHeight;
        if (Math.abs(objY - objBottomSnapY) < GRID_SNAP_SIZE) {
            snapY = objBottomSnapY;
            didSnap = true;
        }
    }
    
    // Snap to other objects if enabled
    if (snapToObjects) {
        fabricCanvas.forEachObject(other => {
            if (other === obj || !other.visible || other.type === 'line') return;
            
            const otherX = other.left;
            const otherY = other.top;
            const otherWidth = other.getScaledWidth();
            const otherHeight = other.getScaledHeight();
            const otherRight = otherX + otherWidth;
            const otherBottom = otherY + otherHeight;
            
            // Snap left to right
            if (Math.abs(objX - otherRight) < OBJECT_SNAP_THRESHOLD) {
                snapX = otherRight;
                didSnap = true;
            }
            
            // Snap right to left
            if (Math.abs(objRight - otherX) < OBJECT_SNAP_THRESHOLD) {
                snapX = otherX - objWidth;
                didSnap = true;
            }
            
            // Snap top to bottom
            if (Math.abs(objY - otherBottom) < OBJECT_SNAP_THRESHOLD) {
                snapY = otherBottom;
                didSnap = true;
            }
            
            // Snap bottom to top
            if (Math.abs(objBottom - otherY) < OBJECT_SNAP_THRESHOLD) {
                snapY = otherY - objHeight;
                didSnap = true;
            }
            
            // Align centers horizontally
            const otherCenterX = otherX + otherWidth/2;
            const objCenterX = objX + objWidth/2;
            if (Math.abs(objCenterX - otherCenterX) < OBJECT_SNAP_THRESHOLD) {
                snapX = otherCenterX - objWidth/2;
                didSnap = true;
            }
            
            // Align centers vertically
            const otherCenterY = otherY + otherHeight/2;
            const objCenterY = objY + objHeight/2;
            if (Math.abs(objCenterY - otherCenterY) < OBJECT_SNAP_THRESHOLD) {
                snapY = otherCenterY - objHeight/2;
                didSnap = true;
            }
        });
    }
    
    // Apply snap if occurred
    if (didSnap) {
        obj.set({
            left: snapX,
            top: snapY
        });
        obj.setCoords();
    }
}

/**
 * Prevents Fabric objects from moving/scaling outside canvas bounds.
 * Operates on the FINAL DISPLAY canvas dimensions.
 */
function preventObjectOverflow(options) {
    const obj = options.target;
    if (!obj) return;

    obj.setCoords();

    // If this is a moving event, apply snapping
    if (options.e && options.e.type === 'mousemove') {
        snapObjectToTarget(obj);
    }

    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    const objBoundingBox = obj.getBoundingRect();

    let needsCorrection = false;

    // Check boundaries
    if (objBoundingBox.left < 0) {
        obj.left = (obj.left - objBoundingBox.left);
        needsCorrection = true;
    }
    if (objBoundingBox.top < 0) {
        obj.top = (obj.top - objBoundingBox.top);
        needsCorrection = true;
    }
    const rightEdge = objBoundingBox.left + objBoundingBox.width;
    if (rightEdge > canvasWidth) {
        obj.left = obj.left - (rightEdge - canvasWidth);
        needsCorrection = true;
    }
    const bottomEdge = objBoundingBox.top + objBoundingBox.height;
    if (bottomEdge > canvasHeight) {
        obj.top = obj.top - (bottomEdge - canvasHeight);
        needsCorrection = true;
    }

    // Simplified scaling boundary check
    if (obj.isMoving === false && (objBoundingBox.width > canvasWidth || objBoundingBox.height > canvasHeight)) {
        const scaleXCorrection = objBoundingBox.width > canvasWidth ? canvasWidth / objBoundingBox.width : 1;
        const scaleYCorrection = objBoundingBox.height > canvasHeight ? canvasHeight / objBoundingBox.height : 1;
        // Apply scaling correction uniformly based on the dimension that overflows most
        const scaleCorrection = Math.min(scaleXCorrection, scaleYCorrection);

        if (scaleCorrection < 1) {
            // Prevent scaling below a minimum threshold if needed
            // const minScale = 0.1;
            // obj.scaleX = Math.max(minScale, obj.scaleX * scaleCorrection);
            // obj.scaleY = Math.max(minScale, obj.scaleY * scaleCorrection);
            obj.scaleX *= scaleCorrection;
            obj.scaleY *= scaleCorrection;
            needsCorrection = true;
        }

        // Re-check position after scaling correction if correction occurred
        if (needsCorrection) {
            obj.setCoords();
            const newBounds = obj.getBoundingRect();
            if (newBounds.left < 0) obj.left = (obj.left - newBounds.left);
            if (newBounds.top < 0) obj.top = (obj.top - newBounds.top);
            if (newBounds.left + newBounds.width > canvasWidth) obj.left = obj.left - ((newBounds.left + newBounds.width) - canvasWidth);
            if (newBounds.top + newBounds.height > canvasHeight) obj.top = obj.top - ((newBounds.top + newBounds.height) - canvasHeight);
        }
    }

    if (needsCorrection) {
        obj.setCoords(); // Final coordinate update after corrections
    }
}

/**
 * Determines the orientation category of an image
 * @param {HTMLImageElement} img - The image element to check
 * @returns {string} 'portrait' or 'landscape'
 */
function getImageOrientation(img) {
    const aspectRatio = img.width / img.height;
    return aspectRatio >= 1 ? 'landscape' : 'portrait';
}

/**
 * Creates a unique ID for each image
 * @returns {string} Unique ID
 */
function generateImageId() {
    return 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * Adds an image to the staging area
 * @param {File} file - The image file
 */
function stageImage(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imgElement = new Image();
        imgElement.onload = function() {
            // Determine orientation
            const orientation = getImageOrientation(imgElement);
            const id = generateImageId();
            
            // Create staged image data
            const stagedImage = {
                id: id,
                src: e.target.result,
                file: file,
                width: imgElement.width,
                height: imgElement.height,
                orientation: orientation,
                selected: false,
                scaleFactor: 1 // Default scale factor
            };
            
            // Add to appropriate array
            stagedImages[orientation].push(stagedImage);
            
            // Create and add thumbnail
            addThumbnail(stagedImage);
            
            // Update carousel display
            updateCarousels();
        };
        
        imgElement.onerror = function() {
            console.error("Error loading image");
            showFileError(`Error loading image: ${file.name}. Please try again.`);
        };
        
        imgElement.src = e.target.result;
    };
    
    reader.onerror = function() {
        console.error("Error reading file");
        showFileError(`Error reading file: ${file.name}. Please try again.`);
    };
    
    reader.readAsDataURL(file);
}

/**
 * Creates and adds a thumbnail to the appropriate carousel
 * @param {Object} imageData - The staged image data
 */
function addThumbnail(imageData) {
    // Initialize scale factor if not present
    if (imageData.scaleFactor === undefined) {
        imageData.scaleFactor = 1; // Default scale factor
    }
    
    // Clear placeholder if present
    const container = imageData.orientation === 'portrait' ? portraitContainer : landscapeContainer;
    if (container.querySelector('.text-gray-400')) {
        container.innerHTML = '';
    }
    
    // Create thumbnail container
    const thumbnail = document.createElement('div');
    thumbnail.className = 'relative group flex-shrink-0 mb-14'; // Increased bottom margin for two rows of buttons
    thumbnail.setAttribute('data-id', imageData.id);
    
    // Calculate thumbnail dimensions - fixed height but maintain aspect ratio
    const aspect = imageData.width / imageData.height;
    const thumbHeight = THUMBNAIL_HEIGHT;
    const thumbWidth = Math.round(thumbHeight * aspect);
    
    // Create thumbnail image
    const img = document.createElement('img');
    img.src = imageData.src;
    img.className = 'rounded cursor-pointer transition transform hover:scale-105 border-2';
    img.style.height = `${thumbHeight}px`;
    img.style.width = `${thumbWidth}px`; 
    img.style.objectFit = 'cover';
    img.alt = imageData.file.name;
    img.title = imageData.file.name;
    
    // Default border
    img.style.borderColor = 'transparent';
    
    // Create control overlay
    const controls = document.createElement('div');
    controls.className = 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1 opacity-0 group-hover:opacity-100 transition flex justify-center space-x-2';
    
    // Add to Canvas button
    const addToCanvasBtn = document.createElement('button');
    addToCanvasBtn.className = 'text-white p-1 rounded hover:bg-green-700';
    addToCanvasBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>';
    addToCanvasBtn.title = 'Add to canvas';
    
    // Rotate button
    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'text-white p-1 rounded hover:bg-gray-700';
    rotateBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
    rotateBtn.title = 'Rotate image';
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-white p-1 rounded hover:bg-red-700';
    deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
    deleteBtn.title = 'Remove image';
    
    // Create scale buttons container (now with flex column for two rows)
    const scaleContainer = document.createElement('div');
    scaleContainer.className = 'absolute -bottom-14 left-0 right-0 bg-gray-800 bg-opacity-75 p-1 flex flex-col justify-center gap-1 text-xs rounded-b overflow-hidden';
    
    // Split scale factors into two rows
    const firstRowFactors = SCALE_FACTORS.slice(0, 3); // 0.25, 0.5, 0.75
    const secondRowFactors = SCALE_FACTORS.slice(3);   // 1, 2, 3
    
    // Create first row of scale buttons
    const firstRow = document.createElement('div');
    firstRow.className = 'flex justify-center gap-1';
    
    firstRowFactors.forEach(factor => {
        const scaleBtn = document.createElement('button');
        scaleBtn.innerText = factor + 'x';
        
        // Highlight the active scale factor
        if (factor === imageData.scaleFactor) {
            scaleBtn.className = 'px-2 py-1 bg-blue-600 text-white rounded-sm flex-1';
        } else {
            scaleBtn.className = 'px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-sm flex-1';
        }
        
        scaleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateImageScale(imageData.id, factor);
        });
        
        firstRow.appendChild(scaleBtn);
    });
    
    // Create second row of scale buttons
    const secondRow = document.createElement('div');
    secondRow.className = 'flex justify-center gap-1';
    
    secondRowFactors.forEach(factor => {
        const scaleBtn = document.createElement('button');
        scaleBtn.innerText = factor + 'x';
        
        // Highlight the active scale factor
        if (factor === imageData.scaleFactor) {
            scaleBtn.className = 'px-2 py-1 bg-blue-600 text-white rounded-sm flex-1';
        } else {
            scaleBtn.className = 'px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-sm flex-1';
        }
        
        scaleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateImageScale(imageData.id, factor);
        });
        
        secondRow.appendChild(scaleBtn);
    });
    
    // Add both rows to the scale container
    scaleContainer.appendChild(firstRow);
    scaleContainer.appendChild(secondRow);
    
    // Add event listeners
    img.addEventListener('click', function() {
        toggleImageSelection(imageData.id);
    });
    
    addToCanvasBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        addSingleImageToCanvas(imageData);
    });
    
    rotateBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        rotateImage(imageData.id);
    });
    
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeImage(imageData.id);
    });
    
    // Assemble components
    controls.appendChild(addToCanvasBtn);
    controls.appendChild(rotateBtn);
    controls.appendChild(deleteBtn);
    thumbnail.appendChild(img);
    thumbnail.appendChild(controls);
    thumbnail.appendChild(scaleContainer);
    container.appendChild(thumbnail);
}

/**
 * Updates the scale factor for an image
 * @param {string} id - The image ID
 * @param {number} scaleFactor - The new scale factor
 */
function updateImageScale(id, scaleFactor) {
    let found = false;
    let updatedType = ''; // Track which type (portrait/landscape) the image belongs to
    
    ['portrait', 'landscape'].forEach(type => {
        const imageIndex = stagedImages[type].findIndex(img => img.id === id);
        if (imageIndex >= 0) {
            found = true;
            updatedType = type;
            const currentImage = stagedImages[type][imageIndex];
            
            // Remove from current position
            stagedImages[type].splice(imageIndex, 1);
            
            // Update scale factor
            currentImage.scaleFactor = scaleFactor;
            
            // We'll sort stagedImages by scale factor to group images
            // Find the right position to insert based on scale
            let insertIndex = stagedImages[type].findIndex(img => img.scaleFactor > scaleFactor);
            if (insertIndex === -1) insertIndex = stagedImages[type].length;
            
            // Insert at the correct position to maintain scale order
            stagedImages[type].splice(insertIndex, 0, currentImage);
            
            // Remove the thumbnail - we'll rebuild the entire container to show proper grouping
            const thumbnail = document.querySelector(`[data-id="${id}"]`);
            if (thumbnail) {
                thumbnail.remove();
            }
        }
    });
    
    if (found) {
        // Rebuild the entire carousel for the updated type to show proper grouping
        rebuildCarousel(updatedType);
        
        // Find the new thumbnail and scroll it into view
        setTimeout(() => {
            const newThumbnail = document.querySelector(`[data-id="${id}"]`);
            if (newThumbnail) {
                newThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                
                // Add a brief highlight effect
                newThumbnail.classList.add('scale-highlight');
                setTimeout(() => {
                    newThumbnail.classList.remove('scale-highlight');
                }, 1000);
            }
        }, 100);
        
        console.log(`Updated scale factor for image ${id} to ${scaleFactor}x`);
    }
}

/**
 * Rebuilds the entire carousel for a specific type (portrait/landscape)
 * to properly group images by scale factor
 * @param {string} type - The image type ('portrait' or 'landscape')
 */
function rebuildCarousel(type) {
    const container = type === 'portrait' ? portraitContainer : landscapeContainer;
    
    // Clear the container
    container.innerHTML = '';
    
    // If no images, show placeholder
    if (stagedImages[type].length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 italic py-8 px-12 border border-gray-200 rounded-md">No ${type} images yet</div>`;
        return;
    }
    
    // Group images by scale factor
    const groupedByScale = {};
    SCALE_FACTORS.forEach(scale => {
        groupedByScale[scale] = stagedImages[type].filter(img => img.scaleFactor === scale);
    });
    
    // Add each group with dividers
    let isFirst = true;
    SCALE_FACTORS.forEach(scale => {
        const imagesWithScale = groupedByScale[scale];
        if (imagesWithScale.length === 0) return;
        
        // Add divider before each group (except the first)
        if (!isFirst) {
            const divider = document.createElement('div');
            divider.className = 'scale-divider h-full w-1 bg-gradient-to-b from-pwint-magenta to-pwint-cyan mx-2 rounded-full';
            container.appendChild(divider);
        } else {
            isFirst = false;
        }
        
        // Add scale label with image count
        const scaleLabel = document.createElement('div');
        scaleLabel.className = 'scale-label bg-gray-800 text-white text-xs py-1 px-3 rounded-full self-center flex items-center';
        
        // Create scale icon
        const scaleIcon = document.createElement('span');
        if (scale < 1) {
            scaleIcon.innerHTML = '🔍'; // Magnifying glass for small scales
        } else if (scale === 1) {
            scaleIcon.innerHTML = '✓'; // Checkmark for normal scale
        } else {
            scaleIcon.innerHTML = '🔎'; // Magnifying glass with plus for large scales
        }
        scaleIcon.className = 'mr-1';
        
        scaleLabel.appendChild(scaleIcon);
        
        // Add text with count
        const scaleLabelText = document.createElement('span');
        scaleLabelText.innerText = `${scale}× (${imagesWithScale.length})`;
        scaleLabel.appendChild(scaleLabelText);
        
        container.appendChild(scaleLabel);
        
        // Add all images in this scale group
        imagesWithScale.forEach(imageData => {
            addThumbnail(imageData);
        });
    });
}

/**
 * Adds a single image to the canvas
 * @param {Object} imageData - The image data object
 */
function addSingleImageToCanvas(imageData) {
    fabric.Image.fromURL(imageData.src, function(img) {
        // Get canvas dimensions
        const canvasWidth = fabricCanvas.getWidth();
        const canvasHeight = fabricCanvas.getHeight();
        
        // Calculate scale to fit approximately 1/3 of the canvas
        const targetWidth = canvasWidth / 3;
        const targetHeight = canvasHeight / 3;
        
        const imgAspect = imageData.width / imageData.height;
        
        let scaleX, scaleY;
        
        if (imgAspect > 1) { // Landscape orientation
            scaleX = targetWidth / imageData.width;
            scaleY = scaleX;
        } else { // Portrait orientation
            scaleY = targetHeight / imageData.height;
            scaleX = scaleY;
        }
        
        // Apply user-selected scale factor
        const userScaleFactor = imageData.scaleFactor || 1;
        scaleX *= userScaleFactor;
        scaleY *= userScaleFactor;
        
        // Position at center of canvas or in a vacant area
        img.set({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scaleX,
            scaleY: scaleY,
            borderColor: '#e91e63', // Pwint magenta
            cornerColor: '#e91e63', // Pwint magenta
            cornerSize: Math.max(8, Math.min(14, canvasWidth / 60)),
            cornerStyle: 'circle',
            transparentCorners: false,
            padding: 0,
            strokeWidth: 0,
            cornerStrokeColor: '#ffffff'
        });
        
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
    }, { crossOrigin: 'anonymous' });
}

/**
 * Updates the carousels display
 */
function updateCarousels() {
    // Rebuild both carousels with proper grouping
    rebuildCarousel('portrait');
    rebuildCarousel('landscape');
    
    // Update selection visuals
    updateSelectionVisuals();
}

/**
 * Toggles selection state of an image
 * @param {string} id - The image ID
 */
function toggleImageSelection(id) {
    // Find the image in either portrait or landscape array
    let found = false;
    
    ['portrait', 'landscape'].forEach(type => {
        const imageIndex = stagedImages[type].findIndex(img => img.id === id);
        if (imageIndex >= 0) {
            found = true;
            stagedImages[type][imageIndex].selected = !stagedImages[type][imageIndex].selected;
            
            // Update selectedImages array
            const selectedIndex = selectedImages.indexOf(id);
            if (stagedImages[type][imageIndex].selected) {
                if (selectedIndex === -1) {
                    selectedImages.push(id);
                }
            } else {
                if (selectedIndex !== -1) {
                    selectedImages.splice(selectedIndex, 1);
                }
            }
        }
    });
    
    if (found) {
        updateSelectionVisuals();
    }
}

/**
 * Updates the visuals for selected images
 */
function updateSelectionVisuals() {
    // Update all thumbnails
    document.querySelectorAll('[data-id]').forEach(thumb => {
        const id = thumb.getAttribute('data-id');
        const img = thumb.querySelector('img');
        
        if (selectedImages.includes(id)) {
            img.style.borderColor = '#e91e63'; // Pwint magenta
            img.classList.add('ring-2', 'ring-pink-600');
        } else {
            img.style.borderColor = 'transparent';
            img.classList.remove('ring-2', 'ring-pink-600');
        }
    });
}

/**
 * Rotates an image (changing its orientation)
 * @param {string} id - The image ID
 */
function rotateImage(id) {
    // Find the image in either portrait or landscape array
    ['portrait', 'landscape'].forEach(type => {
        const imageIndex = stagedImages[type].findIndex(img => img.id === id);
        if (imageIndex >= 0) {
            const image = stagedImages[type][imageIndex];
            
            // Swap width and height
            const tempWidth = image.width;
            image.width = image.height;
            image.height = tempWidth;
            
            // Change orientation
            const newOrientation = type === 'portrait' ? 'landscape' : 'portrait';
            image.orientation = newOrientation;
            
            // Move to the other array
            stagedImages[newOrientation].push(image);
            
            // Remove from the old array
            stagedImages[type].splice(imageIndex, 1);
            
            // Remove thumbnail
            const thumbnail = document.querySelector(`[data-id="${id}"]`);
            if (thumbnail) {
                thumbnail.remove();
            }
            
            // Rebuild both carousels
            rebuildCarousel(type);
            rebuildCarousel(newOrientation);
            
            // Find the new thumbnail and scroll it into view
            setTimeout(() => {
                const newThumbnail = document.querySelector(`[data-id="${id}"]`);
                if (newThumbnail) {
                    newThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    
                    // Add a brief highlight effect
                    newThumbnail.classList.add('scale-highlight');
                    setTimeout(() => {
                        newThumbnail.classList.remove('scale-highlight');
                    }, 1000);
                }
            }, 100);
        }
    });
    
    // Update selection visuals
    updateSelectionVisuals();
}

/**
 * Removes an image from the staged images
 * @param {string} id - The image ID
 */
function removeImage(id) {
    let found = false;
    let removedType = '';
    
    ['portrait', 'landscape'].forEach(type => {
        const imageIndex = stagedImages[type].findIndex(img => img.id === id);
        if (imageIndex >= 0) {
            found = true;
            removedType = type;
            
            // Remove from array
            stagedImages[type].splice(imageIndex, 1);
            
            // Remove from selectedImages
            const selectedIndex = selectedImages.indexOf(id);
            if (selectedIndex !== -1) {
                selectedImages.splice(selectedIndex, 1);
            }
        }
    });
    
    if (found) {
        // Rebuild the carousel for the type that had an image removed
        rebuildCarousel(removedType);
        updateSelectionVisuals();
        console.log(`Removed image ${id}`);
    }
}

/**
 * Clears all selected images
 */
function clearSelection() {
    selectedImages = [];
    
    // Update all images' selected status
    ['portrait', 'landscape'].forEach(type => {
        stagedImages[type].forEach(img => {
            img.selected = false;
        });
    });
    
    updateSelectionVisuals();
}

/**
 * Selects all images of the specified type (portrait or landscape)
 * @param {string} type - The image type ('portrait' or 'landscape')
 */
function selectAllImages(type) {
    if (!stagedImages[type] || stagedImages[type].length === 0) {
        showFileError(`No ${type} images to select.`);
        return;
    }
    
    // For each image of this type, select it if not already selected
    stagedImages[type].forEach(image => {
        if (!image.selected) {
            image.selected = true;
            // Add to selectedImages if not already there
            if (!selectedImages.includes(image.id)) {
                selectedImages.push(image.id);
            }
        }
    });
    
    // Update the UI to reflect the new selections
    updateSelectionVisuals();
    console.log(`Selected all ${type} images: ${stagedImages[type].length} total`);
}

/**
 * Unselects all images of the specified type (portrait or landscape)
 * @param {string} type - The image type ('portrait' or 'landscape')
 */
function unselectAllImages(type) {
    if (!stagedImages[type] || stagedImages[type].length === 0) {
        return;
    }
    
    // For each image of this type, unselect it if selected
    stagedImages[type].forEach(image => {
        if (image.selected) {
            image.selected = false;
            // Remove from selectedImages if present
            const index = selectedImages.indexOf(image.id);
            if (index !== -1) {
                selectedImages.splice(index, 1);
            }
        }
    });
    
    // Update the UI to reflect the new selections
    updateSelectionVisuals();
    console.log(`Unselected all ${type} images`);
}

/**
 * Auto-arranges selected images on the canvas
 */
function autoArrangeImages() {
    if (selectedImages.length === 0) {
        showFileError('Please select images to arrange');
        return;
    }
    
    // Reset the canvas first
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    clearGridLines();
    
    // Collect selected images data
    const selectedImagesData = [];
    
    ['portrait', 'landscape'].forEach(type => {
        stagedImages[type].forEach(img => {
            if (img.selected) {
                selectedImagesData.push(img);
            }
        });
    });
    
    // Get canvas dimensions
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    
    // Count different image types
    const totalImages = selectedImagesData.length;
    const numLandscape = selectedImagesData.filter(img => img.orientation === 'landscape').length;
    const numPortrait = selectedImagesData.filter(img => img.orientation === 'portrait').length;
    
    // Calculate optimal grid size based on number of images
    // Use fewer grid cells for better image sizes
    let gridCols, gridRows;
    
    if (totalImages <= 2) {
        // For 1-2 images, use 1 row
        gridCols = totalImages;
        gridRows = 1;
    } else if (totalImages <= 4) {
        // For 3-4 images, use 2x2 grid
        gridCols = 2;
        gridRows = 2;
    } else if (totalImages <= 6) {
        // For 5-6 images, use 3x2 grid
        gridCols = 3;
        gridRows = 2;
    } else if (totalImages <= 9) {
        // For 7-9 images, use 3x3 grid
        gridCols = 3;
        gridRows = 3;
    } else if (totalImages <= 12) {
        // For 10-12 images, use 4x3 grid
        gridCols = 4;
        gridRows = 3;
    } else {
        // For many images, calculate a reasonable grid size
        gridCols = Math.ceil(Math.sqrt(totalImages));
        gridRows = Math.ceil(totalImages / gridCols);
    }
    
    // Adjust for portrait-heavy or landscape-heavy collections
    if (numPortrait > numLandscape * 2 && gridRows < gridCols) {
        // Switch rows and columns for portrait-heavy collections
        [gridRows, gridCols] = [gridCols, gridRows];
    } else if (numLandscape > numPortrait * 2 && gridCols < gridRows) {
        // Ensure more columns for landscape-heavy collections
        [gridRows, gridCols] = [gridCols, gridRows];
    }
    
    // Ensure minimum grid size
    gridRows = Math.max(1, gridRows);
    gridCols = Math.max(1, gridCols);
    
    console.log(`Grid: ${gridCols}x${gridRows} for ${totalImages} images (L:${numLandscape}, P:${numPortrait})`);
    
    // Create a placement matrix to track used cells
    const grid = Array(gridRows).fill().map(() => Array(gridCols).fill(null));
    
    // Cell dimensions
    const cellWidth = canvasWidth / gridCols;
    const cellHeight = canvasHeight / gridRows;
    
    // Sort images by size (larger first)
    selectedImagesData.sort((a, b) => {
        const aSize = a.width * a.height;
        const bSize = b.width * b.height;
        return bSize - aSize;
    });
    
    // Place images with proper gaps for snapping
    let unplacedImages = [];
    const SNAP_GAP = 0; // No gap between images as requested
    
    // First pass - place large images with optimal cell span
    selectedImagesData.forEach(imageData => {
        // Determine optimal span based on orientation
        let spanRows, spanCols;
        
        if (imageData.orientation === 'landscape') {
            spanRows = 1;
            spanCols = 2;
        } else { // portrait
            spanRows = 2;
            spanCols = 1;
        }
        
        // Ensure span fits in grid
        spanRows = Math.min(spanRows, gridRows);
        spanCols = Math.min(spanCols, gridCols);
        
        // Try to place with optimal span
        let placed = tryPlaceWithSpan(imageData, grid, cellWidth, cellHeight, gridRows, gridCols, 
                                  spanRows, spanCols, SNAP_GAP);
        
        // If can't place with optimal span, try with smaller spans
        if (!placed && (spanRows > 1 || spanCols > 1)) {
            // Try with single cell
            placed = tryPlaceWithSpan(imageData, grid, cellWidth, cellHeight, gridRows, gridCols, 
                                  1, 1, SNAP_GAP);
        }
        
        if (!placed) {
            unplacedImages.push(imageData);
        }
    });
    
    // Second pass - force placement for unplaced images
    if (unplacedImages.length > 0) {
        console.log(`Placing ${unplacedImages.length} remaining images...`);
        
        unplacedImages.forEach(imageData => {
            // Find any available single cell
            for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                    if (grid[r][c] === null) {
                        // Place with single cell
                        grid[r][c] = imageData.id;
                        placeImageInCell(imageData, r, c, 1, 1, cellWidth, cellHeight, SNAP_GAP);
                        return;
                    }
                }
            }
            
            // If no empty cell, place in first cell (overlap)
            if (grid.length > 0 && grid[0].length > 0) {
                placeImageInCell(imageData, 0, 0, 1, 1, cellWidth, cellHeight, SNAP_GAP);
            }
        });
    }
    
    fabricCanvas.renderAll();
}

/**
 * Tries to place an image with specific span
 */
function tryPlaceWithSpan(imageData, grid, cellWidth, cellHeight, gridRows, gridCols, spanRows, spanCols, gap = 0) {
    // Find available grid position
    for (let r = 0; r <= gridRows - spanRows; r++) {
        for (let c = 0; c <= gridCols - spanCols; c++) {
            let canPlace = true;
            
            // Check if all required cells are empty
            for (let sr = 0; sr < spanRows; sr++) {
                for (let sc = 0; sc < spanCols; sc++) {
                    if (grid[r + sr][c + sc] !== null) {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
            
            if (canPlace) {
                // Mark cells as used
                for (let sr = 0; sr < spanRows; sr++) {
                    for (let sc = 0; sc < spanCols; sc++) {
                        grid[r + sr][c + sc] = imageData.id;
                    }
                }
                
                // Place the image
                placeImageInCell(imageData, r, c, spanRows, spanCols, cellWidth, cellHeight, gap);
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Places an image in a specific grid cell on the canvas
 */
function placeImageInCell(imageData, row, col, spanRows, spanCols, cellWidth, cellHeight, gap = 0, scaleFactor = 1.0) {
    // Calculate position and dimensions
    const left = col * cellWidth + gap;
    const top = row * cellHeight + gap;
    const width = spanCols * cellWidth - (gap * 2);
    const height = spanRows * cellHeight - (gap * 2);
    
    // Load the image onto the canvas
    fabric.Image.fromURL(imageData.src, function(img) {
        // Calculate scale to fit the cell, preserving aspect ratio
        const imgAspect = imageData.width / imageData.height;
        const cellAspect = width / height;
        
        let scaleX, scaleY;
        
        if (imgAspect > cellAspect) {
            // Image is wider than cell proportion, scale to fit width
            scaleX = width / imageData.width;
            scaleY = scaleX;
        } else {
            // Image is taller than cell proportion, scale to fit height
            scaleY = height / imageData.height;
            scaleX = scaleY;
        }
        
        // Apply scaling and position - use scaleFactor close to 1 for tighter fit
        img.set({
            left: left + width/2,
            top: top + height/2,
            originX: 'center',
            originY: 'center',
            scaleX: scaleX * scaleFactor,
            scaleY: scaleY * scaleFactor,
            borderColor: '#e91e63', // Pwint magenta
            cornerColor: '#e91e63', // Pwint magenta
            cornerSize: Math.max(8, Math.min(14, cellWidth / 10)),
            cornerStyle: 'circle',
            transparentCorners: false,
            padding: 0,
            strokeWidth: 0,
            cornerStrokeColor: '#ffffff'
        });
        
        fabricCanvas.add(img);
    }, { crossOrigin: 'anonymous' });
}

/**
 * Handles file drop event for the staging area
 */
function handleStagingFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('bg-gray-200');
    dropZone.classList.add('bg-gray-100');
    fileErrorMsg.style.display = 'none';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

/**
 * Processes files from input or drop event
 */
function processFiles(files) {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    let validImagesCount = 0;
    
    Array.from(files).forEach(file => {
        if (validImageTypes.includes(file.type)) {
            stageImage(file);
            validImagesCount++;
        } else {
            console.error(`Invalid file type: ${file.type}`);
        }
    });
    
    if (validImagesCount === 0) {
        showFileError();
    } else {
        // Sort images by scale factor
        ['portrait', 'landscape'].forEach(type => {
            stagedImages[type].sort((a, b) => a.scaleFactor - b.scaleFactor);
        });
        
        // Rebuild the carousels with proper grouping
        updateCarousels();
    }
}

/**
 * Shows the file type error message.
 */
function showFileError(message = 'Only image files (JPG, PNG, GIF, SVG) are allowed.') {
    fileErrorMsg.textContent = message;
    fileErrorMsg.style.display = 'block';
}

/**
 * Handles keyboard events for deleting selected object and admin mode.
 */
function handleKeyDown(e) {
    // Admin mode toggle (Ctrl+Alt+A)
    if (e[_0x5a7c[3]] && e[_0x5a7c[4]] && e[_0x5a7c[5]] === _0x5a7c[6]) {
        // Use the obfuscated function name and password
        window[_0x5a7c[0]](_0x5a7c[1]);
        e.preventDefault();
        return;
    }
    
    // Delete selected images when Delete key is pressed
    if (e[_0x5a7c[5]] === _0x5a7c[7] && selectedImages.length > 0) {
        // Use the obfuscated function name
        selectedImages.forEach(id => window[_0x5a7c[8]](id));
        e.preventDefault();
        return;
    }
    
    // Handle Delete/Backspace for deleting active objects on canvas
    if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvas.getActiveObject()) {
        const activeElementTag = document.activeElement?.tagName;
        if (activeElementTag !== 'INPUT' && activeElementTag !== 'TEXTAREA' && activeElementTag !== 'SELECT') {
            e.preventDefault();
            fabricCanvas.remove(fabricCanvas.getActiveObject());
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
        }
    }
}

/**
 * Resets the canvas to its initial empty state.
 */
function resetCanvas() {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    clearGridLines(); // Clear any grid lines (they're not part of fabricCanvas)
    currentMosaicTemplate = null; // Reset mosaic template
    gridLines = []; // Reset grid lines array
    fabricCanvas.renderAll();
    fileErrorMsg.style.display = 'none';
    
    // Reset template selection UI
    document.querySelectorAll('.mosaic-template').forEach(t => {
        t.classList.remove('border-pwint-magenta', 'bg-pink-50');
        t.classList.add('border-gray-300');
    });
    customGridControls.style.display = 'none';
}

/**
 * Saves the canvas content as a PDF.
 * Uses REAL print dimensions for PDF generation.
 * In admin mode, no watermark is added.
 */
async function saveAsPdf() {
    loadingIndicator.style.display = 'block';
    savePdfButton.disabled = true;

    const activeObject = fabricCanvas.getActiveObject();
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

    // Get REAL print dimensions for PDF
    const dims = calculateCanvasDimensions();
    const pdfWidthPt = dims.realWidthPx * (72 / DPI);
    const pdfHeightPt = dims.realHeightPx * (72 / DPI);

    const orientation = pdfWidthPt > pdfHeightPt ? 'l' : 'p';

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: [pdfWidthPt, pdfHeightPt]
    });

    try {
        // Use a potentially higher multiplier for better PDF quality
        const targetMultiplier = Math.min(6, dims.realWidthPx / dims.displayWidthPx); // Cap multiplier

        const dataUrl = fabricCanvas.toDataURL({
            format: 'png',
            quality: 0.92,
            multiplier: Math.max(1, targetMultiplier)
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidthPt, pdfHeightPt, undefined, 'FAST');

        // Only add watermark if not in admin mode
        if (!adminMode) {
            // --- Add Watermark ---
            const baseFontSize = 48;
            const diagonal = Math.sqrt(pdfWidthPt * pdfWidthPt + pdfHeightPt * pdfHeightPt);
            const fontSize = Math.max(24, Math.min(120, baseFontSize * (diagonal / 1000)));

            pdf.setFontSize(fontSize);
            pdf.setTextColor(150, 150, 150);
            pdf.GState(new pdf.GState({opacity: 0.3}));

            const watermarkOptions = { align: 'center', angle: 45, baseline: 'middle' };
            pdf.text(WATERMARK_TEXT, pdfWidthPt / 2, pdfHeightPt / 2, watermarkOptions);
            pdf.text(WATERMARK_TEXT, pdfWidthPt / 4, pdfHeightPt / 4, watermarkOptions);
            pdf.text(WATERMARK_TEXT, pdfWidthPt * 3 / 4, pdfHeightPt * 3 / 4, watermarkOptions);
            pdf.text(WATERMARK_TEXT, pdfWidthPt / 4, pdfHeightPt * 3 / 4, watermarkOptions);
            pdf.text(WATERMARK_TEXT, pdfWidthPt * 3 / 4, pdfHeightPt / 4, watermarkOptions);

            pdf.GState(new pdf.GState({opacity: 1}));
        }

        // Different filename based on mode
        const modeSuffix = adminMode ? "print" : "preview";
        const filename = `print_design_${currentPaperHeightInches}inx${currentPrintWidthInches}in_${modeSuffix}_${Date.now()}.pdf`;
        pdf.save(filename.replace('..', '.'));

    } catch (error) {
        console.error("Error generating PDF:", error);
        showFileError("An error occurred while generating the PDF. Please check console for details.");
    } finally {
        if (activeObject) {
            fabricCanvas.setActiveObject(activeObject);
        }
        loadingIndicator.style.display = 'none';
        savePdfButton.disabled = false;
        fabricCanvas.renderAll();
    }
}

/**
 * Toggles admin mode for special functions
 */
function toggleAdminMode(pw) {
    // Admin password check (obfuscated)
    if (pw === _0x5a7c[1]) {
        adminMode = !adminMode;
        
        // Update the save button text and color
        if (adminMode) {
            savePdfButton.textContent = "Save PDF (No Watermark)";
            savePdfButton.classList.remove("bg-pwint-cyan", "hover:bg-cyan-700");
            savePdfButton.classList.add("bg-purple-600", "hover:bg-purple-700");
            console.log("Admin mode enabled - PDFs will be generated without watermarks");
        } else {
            savePdfButton.textContent = "Save PDF";
            savePdfButton.classList.remove("bg-purple-600", "hover:bg-purple-700");
            savePdfButton.classList.add("bg-pwint-cyan", "hover:bg-cyan-700");
            console.log("Admin mode disabled - PDFs will include watermarks");
        }
        
        // Show admin controls if they exist
        const adminControls = document.getElementById('admin-controls');
        if (adminControls) {
            adminControls.style.display = adminControls.style.display === 'none' ? 'block' : 'none';
        }
    }
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    updateCanvasButton.addEventListener('click', () => {
        currentPaperHeightInches = parseInt(paperTypeSelect.value, 10);
        currentPrintWidthInches = parseFloat(printWidthInput.value);

        const minWid = parseFloat(printWidthInput.min);
        const maxWid = parseFloat(printWidthInput.max);
        if (isNaN(currentPrintWidthInches) || currentPrintWidthInches < minWid || currentPrintWidthInches > maxWid) {
            alert(`Please enter a width between ${minWid}" and ${maxWid}".`);
            printWidthInput.value = Math.max(minWid, Math.min(maxWid, currentPrintWidthInches || minWid));
            currentPrintWidthInches = parseFloat(printWidthInput.value);
        }
        updateCanvasSize();
        
        // Reapply mosaic template if one exists
        if (currentMosaicTemplate) {
            applyMosaicTemplate(currentMosaicTemplate.template);
        }
    });

    // Staging area drop zone listeners
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('bg-gray-100');
        dropZone.classList.add('bg-gray-200');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('bg-gray-200');
        dropZone.classList.add('bg-gray-100');
    });
    
    dropZone.addEventListener('drop', handleStagingFileDrop);
    
    // File input listener
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
            // Reset file input
            e.target.value = '';
        }
    });
    
    // Auto-arrange button
    autoArrangeBtn.addEventListener('click', autoArrangeImages);
    
    // Clear selection button
    clearSelectionBtn.addEventListener('click', clearSelection);

    // Canvas drag listeners (prevent old behavior)
    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    canvasContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // No longer allowing direct drops on canvas
    });

    // Button listeners
    resetButton.addEventListener('click', resetCanvas);
    savePdfButton.addEventListener('click', saveAsPdf);
    
    // Mosaic template listeners
    document.querySelectorAll('.mosaic-template').forEach(template => {
        template.addEventListener('click', (e) => {
            // Highlight selected template
            document.querySelectorAll('.mosaic-template').forEach(t => {
                t.classList.remove('border-pwint-magenta', 'bg-pink-50');
                t.classList.add('border-gray-300');
            });
            template.classList.remove('border-gray-300');
            template.classList.add('border-pwint-magenta', 'bg-pink-50');
            
            // Show/hide custom grid controls
            const templateType = template.getAttribute('data-template');
            if (templateType === 'custom') {
                customGridControls.style.display = 'block';
            } else {
                customGridControls.style.display = 'none';
            }
        });
    });
    
    // Apply mosaic button
    applyMosaicButton.addEventListener('click', () => {
        const selectedTemplate = document.querySelector('.mosaic-template.border-pwint-magenta');
        if (selectedTemplate) {
            const templateType = selectedTemplate.getAttribute('data-template');
            applyMosaicTemplate(templateType);
        } else {
            showFileError('Please select a mosaic template first.');
        }
    });
    
    // Snap settings listeners
    snapToGridCheckbox.addEventListener('change', (e) => {
        snapToGrid = e.target.checked;
    });
    
    snapToObjectsCheckbox.addEventListener('change', (e) => {
        snapToObjects = e.target.checked;
    });

    // Keyboard listener for delete
    window.addEventListener('keydown', handleKeyDown);

    // Update canvas on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        // Use a short debounce to avoid excessive recalculations during rapid resize
        resizeTimeout = setTimeout(() => {
            updateCanvasSize();
            // Reapply mosaic template if one exists
            if (currentMosaicTemplate) {
                applyMosaicTemplate(currentMosaicTemplate.template);
            }
        }, 100);
    });

    // Select All buttons
    document.querySelectorAll('.select-all-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            selectAllImages(type);
        });
    });
    
    // Unselect All buttons
    document.querySelectorAll('.unselect-all-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            unselectAllImages(type);
        });
    });
}

/**
 * Initialize the application when DOM is loaded
 */
function initApp() {
    // Initialize DOM elements
    initDomElements();
    
    // Initialize the canvas
    initializeCanvas();
    
    // Set up event listeners
    setupEventListeners();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Add CSS for the highlight effect to the existing styles
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .scale-highlight {
            box-shadow: 0 0 0 3px var(--magenta);
            transform: scale(1.05);
            transition: all 0.3s ease;
            z-index: 10;
        }
        
        .scale-divider {
            min-height: 150px;
            opacity: 0.6;
        }
        
        .scale-label {
            margin: 5px;
        }
        
        #portrait-container, #landscape-container {
            align-items: center;
        }
    `;
    document.head.appendChild(style);
});
