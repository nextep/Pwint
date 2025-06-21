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
const PADDING_OFFSET = 15; // Negative offset for cell padding to allow bleeding edges

let fabricCanvas; // Fabric.js canvas instance
let currentPaperHeightInches = 24; // This now controls REAL HEIGHT (based on paper type)
let currentPrintWidthInches = 36; // This now controls REAL WIDTH (user input in inches)
let selectedTemplateIdentifier = null; // Holds the string identifier of the selected template (e.g., '2x2')
let activeTemplateObject = null; // Holds the calculated object for the currently applied template
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
let fitToCellBtn;
let templatePaddingInput;
let autoFitCheckbox;
let cellActionsCard;
let centerInCellBtn;
let fillCellBtn;

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
    fitToCellBtn = document.getElementById('fit-to-cell-btn');
    templatePaddingInput = document.getElementById('template-padding');
    autoFitCheckbox = document.getElementById('auto-fit-on-add');
    cellActionsCard = document.getElementById('cell-actions-card');
    centerInCellBtn = document.getElementById('center-in-cell-btn');
    fillCellBtn = document.getElementById('fill-cell-btn');
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
    fabricCanvas.on('object:scaling', snapObjectSize);
    fabricCanvas.on('object:scaling', (e) => applyCellClipping(e.target));
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

    fabricCanvas.on('selection:created', handleObjectSelection);
    fabricCanvas.on('selection:updated', handleObjectSelection);
    fabricCanvas.on('selection:cleared', handleObjectDeselection);

    fabricCanvas.on('object:modified', (e) => {
        const obj = e.target;
        if (!obj || !activeTemplateObject) {
            // If the object is dropped and there is no active template,
            // ensure it has no grid data.
            if (obj && typeof obj.gridRow !== 'undefined') {
                obj.set({ gridRow: undefined, gridCol: undefined });
                applyCellClipping(obj); // This will remove the clip path
                obj.setCoords();
                fabricCanvas.renderAll();
            }
            return;
        }

        const { cellWidth, cellHeight, cols, rows } = activeTemplateObject;
        const center = obj.getCenterPoint();

        // Determine the target cell from the drop location
        const targetCol = Math.floor(center.x / cellWidth);
        const targetRow = Math.floor(center.y / cellHeight);

        // Check if the drop is outside the grid
        if (targetCol < 0 || targetCol >= cols || targetRow < 0 || targetRow >= rows) {
            // Object was dropped outside the grid, so remove its grid properties
            if (typeof obj.gridRow !== 'undefined') {
                obj.set({ gridRow: undefined, gridCol: undefined });
                applyCellClipping(obj); // This will remove the clip path
                obj.setCoords();
                fabricCanvas.renderAll();
            }
            return;
        }

        // Find if another object is already in the target cell
        const targetObject = fabricCanvas.getObjects().find(other => {
            return other !== obj && other.gridRow === targetRow && other.gridCol === targetCol;
        });

        if (targetObject) {
            // If dropping on another object, swap them
            swapObjects(obj, targetObject);
        } else {
            // If dropping on an empty cell or resizing within a cell,
            // update its position and clipping.
            const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
            const targetX = targetCol * cellWidth + padding;
            const targetY = targetRow * cellHeight + padding;
            const targetWidth = cellWidth - (padding * 2);
            const targetHeight = cellHeight - (padding * 2);

            // Update grid position data
            obj.set({
                gridRow: targetRow,
                gridCol: targetCol
            });

            // Re-center the object within the cell.
            // This is desirable for both dropping and resizing to maintain alignment.
            obj.set({
                 left: targetX + (targetWidth - obj.getScaledWidth()) / 2,
                 top: targetY + (targetHeight - obj.getScaledHeight()) / 2,
            });

            // ALWAYS apply clipping after determining the cell
            applyCellClipping(obj);
            obj.setCoords();
        }
        fabricCanvas.renderAll();
    });
}

/**
 * Applies a clipping path to an object to constrain it to its cell boundaries.
 * @param {fabric.Object} obj The fabric object to clip.
 */
function applyCellClipping(obj) {
    if (!obj) return;

    // Remove clipping if the object is not in a grid or there's no active template.
    if (!activeTemplateObject || typeof obj.gridRow === 'undefined') {
        if (obj.clipPath) {
            obj.clipPath = null;
        }
        return;
    }

    const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
    const { cellWidth, cellHeight } = activeTemplateObject;

    // Define the clipping area based on the object's grid position.
    const targetX = obj.gridCol * cellWidth + padding;
    const targetY = obj.gridRow * cellHeight + padding;
    const targetWidth = cellWidth - (padding * 2);
    const targetHeight = cellHeight - (padding * 2);

    // The clipping path is positioned absolutely on the canvas.
    const clipRect = new fabric.Rect({
        left: targetX,
        top: targetY,
        width: targetWidth,
        height: targetHeight,
        absolutePositioned: true // Ensures the clip path is not affected by object's transforms.
    });

    obj.clipPath = clipRect;
}

/**
 * Creates a mosaic grid on the canvas based on a template identifier string.
 * @param {string} identifier - Template identifier (e.g., '2x2', '3x4', 'custom')
 */
function applyMosaicTemplate(identifier) {
    if (!identifier) return;

    clearGridLines();
    
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    
    let rows = 1;
    let cols = 1;
    
    if (identifier === 'custom') {
        rows = parseInt(customRowsInput.value, 10) || 2;
        cols = parseInt(customColsInput.value, 10) || 2;
    } else {
        const parts = identifier.split('x');
        if (parts.length === 2) {
            rows = parseInt(parts[0], 10);
            cols = parseInt(parts[1], 10);
        }
    }
    
    rows = Math.max(1, Math.min(10, rows));
    cols = Math.max(1, Math.min(10, cols));
    
    const cellWidth = canvasWidth / cols;
    const cellHeight = canvasHeight / rows;
    
    createGridLines(rows, cols, canvasWidth, canvasHeight);
    
    // Set the active template object for other functions to use
    activeTemplateObject = {
        identifier: identifier,
        rows,
        cols,
        cellWidth,
        cellHeight
    };
    
    fabricCanvas.renderAll();
    console.log(`Applied mosaic template: ${identifier} (${rows}x${cols})`);
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
    if (snapToGrid && activeTemplateObject) {
        const cellWidth = activeTemplateObject.cellWidth;
        const cellHeight = activeTemplateObject.cellHeight;
        
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
 * Snap object's size to match adjacent objects during scaling.
 * @param {object} options - The event options from Fabric.js
 */
function snapObjectSize(options) {
    const obj = options.target;
    // Return if conditions for snapping aren't met
    if (!obj || !snapToObjects || !activeTemplateObject || typeof obj.gridRow === 'undefined' || !obj.isScaling) {
        return;
    }

    const currentWidth = obj.getScaledWidth();
    const currentHeight = obj.getScaledHeight();

    // Find neighbors in the same row (left or right)
    const neighbors = fabricCanvas.getObjects().filter(other =>
        other !== obj &&
        other.type !== 'line' &&
        other.visible &&
        typeof other.gridRow !== 'undefined' &&
        other.gridRow === obj.gridRow &&
        Math.abs(other.gridCol - obj.gridCol) === 1
    );

    for (const neighbor of neighbors) {
        const neighborWidth = neighbor.getScaledWidth();
        const neighborHeight = neighbor.getScaledHeight();
        let didSnap = false;

        // Snap width if close enough
        if (Math.abs(currentWidth - neighborWidth) < OBJECT_SNAP_THRESHOLD) {
            obj.set('scaleX', neighborWidth / obj.width);
            didSnap = true;
        }

        // Snap height if close enough
        if (Math.abs(currentHeight - neighborHeight) < OBJECT_SNAP_THRESHOLD) {
            obj.set('scaleY', neighborHeight / obj.height);
            didSnap = true;
        }

        if (didSnap) {
            // When snapping, stop checking other neighbors
            // to prevent weird jumps if it's between two neighbours of different sizes.
            break;
        }
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
 * Handles enabling/disabling the 'Fit to Cell' button based on canvas selection.
 */
function handleObjectSelection() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeTemplateObject) {
        cellActionsCard.style.display = 'block';
    } else {
        handleObjectDeselection();
    }
}

function handleObjectDeselection() {
    cellActionsCard.style.display = 'none';
}

/**
 * Fits the currently selected fabric object into the nearest grid cell.
 */
function fitSelectedObjectToCell() {
    const obj = fabricCanvas.getActiveObject();
    if (!obj || !activeTemplateObject) {
        console.warn('Fit to cell called without an active object or template.');
        return;
    }

    const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
    const { rows, cols, cellWidth, cellHeight } = activeTemplateObject;
    
    // Always calculate the current cell based on the object's center
    const center = obj.getCenterPoint();
    const targetCol = Math.max(0, Math.min(cols - 1, Math.floor(center.x / cellWidth)));
    const targetRow = Math.max(0, Math.min(rows - 1, Math.floor(center.y / cellHeight)));

    // Update the object's grid data to its new, correct location
    obj.set({ gridRow: targetRow, gridCol: targetCol });

    // Calculate target cell dimensions with padding
    const targetX = targetCol * cellWidth + padding;
    const targetY = targetRow * cellHeight + padding;
    const targetWidth = cellWidth - (padding * 2);
    const targetHeight = cellHeight - (padding * 2);

    // Calculate scale to fit, preserving aspect ratio
    const imgAspect = obj.width / obj.height;
    const cellAspect = targetWidth / targetHeight;

    let newScale;
    if (imgAspect > cellAspect) {
        // Image is wider than cell, scale to fit width
        newScale = targetWidth / obj.width;
    } else {
        // Image is taller than cell, scale to fit height
        newScale = targetHeight / obj.height;
    }

    obj.set({
        scaleX: newScale,
        scaleY: newScale,
    });
    
    // Center the object within the cell after scaling and positioning
    obj.set({
        left: targetX + (targetWidth - obj.getScaledWidth()) / 2,
        top: targetY + (targetHeight - obj.getScaledHeight()) / 2
    });

    applyCellClipping(obj);
    obj.setCoords();
    fabricCanvas.renderAll();
}

/**
 * Centers the selected object in its grid cell without resizing.
 */
function centerInCell() {
    const obj = fabricCanvas.getActiveObject();
    if (!obj || !activeTemplateObject) return;

    const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
    const { rows, cols, cellWidth, cellHeight } = activeTemplateObject;
    
    // Always calculate the current cell based on the object's center
    const center = obj.getCenterPoint();
    const targetCol = Math.max(0, Math.min(cols - 1, Math.floor(center.x / cellWidth)));
    const targetRow = Math.max(0, Math.min(rows - 1, Math.floor(center.y / cellHeight)));

    // Update the object's grid data
    obj.set({ gridRow: targetRow, gridCol: targetCol });

    const targetX = obj.gridCol * cellWidth + padding;
    const targetY = obj.gridRow * cellHeight + padding;
    const targetWidth = cellWidth - (padding * 2);
    const targetHeight = cellHeight - (padding * 2);

    obj.set({
        left: targetX + (targetWidth - obj.getScaledWidth()) / 2,
        top: targetY + (targetHeight - obj.getScaledHeight()) / 2
    });
    
    applyCellClipping(obj);
    obj.setCoords();
    fabricCanvas.renderAll();
}

/**
 * Scales the selected object to completely fill its grid cell, cropping it.
 */
function fillCell() {
    const obj = fabricCanvas.getActiveObject();
    if (!obj || !activeTemplateObject) return;

    const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
    const { rows, cols, cellWidth, cellHeight } = activeTemplateObject;

    // Always calculate the current cell based on the object's center
    const center = obj.getCenterPoint();
    const targetCol = Math.max(0, Math.min(cols - 1, Math.floor(center.x / cellWidth)));
    const targetRow = Math.max(0, Math.min(rows - 1, Math.floor(center.y / cellHeight)));
    
    // Update the object's grid data
    obj.set({ gridRow: targetRow, gridCol: targetCol });

    const targetX = obj.gridCol * cellWidth + padding;
    const targetY = obj.gridRow * cellHeight + padding;
    const targetWidth = cellWidth - (padding * 2);
    const targetHeight = cellHeight - (padding * 2);

    // Calculate scale to cover the cell
    const scale = Math.max(targetWidth / obj.width, targetHeight / obj.height);
    
    obj.set({
        scaleX: scale,
        scaleY: scale
    });
    
    // Center the now larger image within the cell area
    obj.set({
        left: targetX + (targetWidth - obj.getScaledWidth()) / 2,
        top: targetY + (targetHeight - obj.getScaledHeight()) / 2
    });

    applyCellClipping(obj);
    obj.setCoords();
    fabricCanvas.renderAll();
}

/**
 * Swaps two objects on the canvas based on their grid positions.
 * @param {fabric.Object} obj1 - The object being dragged.
 * @param {fabric.Object} obj2 - The object being swapped with.
 */
function swapObjects(obj1, obj2) {
    const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
    const { cellWidth, cellHeight } = activeTemplateObject;

    // Calculate the target positions with padding for both objects
    const obj1TargetX = obj2.gridCol * cellWidth + padding;
    const obj1TargetY = obj2.gridRow * cellHeight + padding;
    const obj2TargetX = obj1.gridCol * cellWidth + padding;
    const obj2TargetY = obj1.gridRow * cellHeight + padding;
    
    // Animate obj1 moving to obj2's cell
    fabric.util.animate({
        startValue: { left: obj1.left, top: obj1.top },
        endValue: { 
            left: obj1TargetX + (cellWidth - (padding*2) - obj1.getScaledWidth()) / 2, 
            top: obj1TargetY + (cellHeight - (padding*2) - obj1.getScaledHeight()) / 2 
        },
        duration: 250,
        onChange: (values) => {
            obj1.set({ left: values.left, top: values.top }).setCoords();
            fabricCanvas.renderAll();
        },
    });

    // Animate obj2 moving to obj1's original cell
    fabric.util.animate({
        startValue: { left: obj2.left, top: obj2.top },
        endValue: { 
            left: obj2TargetX + (cellWidth - (padding*2) - obj2.getScaledWidth()) / 2,
            top: obj2TargetY + (cellHeight - (padding*2) - obj2.getScaledHeight()) / 2
        },
        duration: 250,
        onChange: (values) => {
            obj2.set({ left: values.left, top: values.top }).setCoords();
            fabricCanvas.renderAll();
        },
        onComplete: () => {
            // Swap the grid metadata after the animation is complete
            const tempGridRow = obj1.gridRow;
            const tempGridCol = obj1.gridCol;
            obj1.set({ gridRow: obj2.gridRow, gridCol: obj2.gridCol }).setCoords();
            obj2.set({ gridRow: tempGridRow, gridCol: tempGridCol }).setCoords();
            
            // Re-apply clipping to both objects in their new positions
            applyCellClipping(obj1);
            applyCellClipping(obj2);

            fabricCanvas.renderAll();
        }
    });
}

/**
 * Auto-arranges selected images on the canvas based on the current template.
 * @param {boolean} reapply - If true, it will re-apply the current layout with new padding.
 */
async function autoArrangeImages(reapply = false) {
    if (!activeTemplateObject) {
        showFileError('Please apply a template first.');
        return;
    }
    
    const objectsToArrange = reapply ? 
        fabricCanvas.getObjects().filter(o => typeof o.gridRow !== 'undefined') : 
        selectedImages;

    if (objectsToArrange.length === 0 && !reapply) {
        showFileError('Please select images from the library to arrange.');
        return;
    }

    const { rows, cols, cellWidth, cellHeight } = activeTemplateObject;
    const totalCells = rows * cols;
    const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;

    if (objectsToArrange.length > totalCells && !reapply) {
        showFileError(`Too many images selected (${objectsToArrange.length}). The template only has ${totalCells} cells.`);
        return;
    }
    
    // Clear canvas before adding new images, but not when reapplying layout
    if (!reapply) {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        applyMosaicTemplate(activeTemplateObject.identifier);
    }
    
    let imagePromises;

    if (reapply) {
        // Rearrange existing objects
        imagePromises = objectsToArrange.map(obj => {
            return new Promise(resolve => {
                const targetX = obj.gridCol * cellWidth + padding;
                const targetY = obj.gridRow * cellHeight + padding;
                const targetWidth = cellWidth - padding * 2;
                const targetHeight = cellHeight - padding * 2;

                const scale = Math.min(targetWidth / obj.width, targetHeight / obj.height);
                
                obj.set({
                    scaleX: scale,
                    scaleY: scale,
                    left: targetX + (targetWidth - obj.getScaledWidth()) / 2,
                    top: targetY + (targetHeight - obj.getScaledHeight()) / 2
                });
                
                obj.setCoords();
                resolve(obj);
            });
        });

    } else {
        // Place new images
        const selectedImagesData = [];
         ['portrait', 'landscape'].forEach(type => {
            stagedImages[type].forEach(img => {
                if (img.selected) {
                    selectedImagesData.push(img);
                }
            });
        });
        
        imagePromises = selectedImagesData.map((imageData, i) => {
            const row = Math.floor(i / cols);
            const col = Math.floor(i % cols);
            return placeImageInCell(imageData, row, col, 1, 1, cellWidth, cellHeight, padding);
        });
    }

    const placedObjects = await Promise.all(imagePromises);
    placedObjects.forEach(applyCellClipping); // Apply clipping to all newly placed objects

    fabricCanvas.renderAll();
    console.log(`Arranged ${objectsToArrange.length} items into a ${rows}x${cols} grid.`);
}

/**
 * Tries to place an image with specific span
 * @returns {Promise<fabric.Image>} A promise that resolves with the created Fabric image object.
 */
function placeImageInCell(imageData, row, col, spanRows, spanCols, cellWidth, cellHeight, gap = 0) {
    return new Promise((resolve) => {
        const left = col * cellWidth + gap;
        const top = row * cellHeight + gap;
        const width = spanCols * cellWidth - (gap * 2);
        const height = spanRows * cellHeight - (gap * 2);

        fabric.Image.fromURL(imageData.src, function(img) {
            const imgAspect = img.width / img.height;
            const cellAspect = width / height;
            
            let scale;
            if (imgAspect > cellAspect) {
                scale = width / img.width; // Fit to width
            } else {
                scale = height / img.height; // Fit to height
            }

            img.set({
                left: left,
                top: top,
                scaleX: scale,
                scaleY: scale,
                originX: 'left',
                originY: 'top',
                borderColor: '#e91e63',
                cornerColor: '#e91e63',
                cornerStyle: 'circle',
                transparentCorners: false,
                gridRow: row, // Custom property for swapping
                gridCol: col  // Custom property for swapping
            });
            
            const centeredLeft = left + (width - img.getScaledWidth()) / 2;
            const centeredTop = top + (height - img.getScaledHeight()) / 2;
            img.set({ left: centeredLeft, top: centeredTop });

            fabricCanvas.add(img);
            resolve(img);
        }, { crossOrigin: 'anonymous' });
    });
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
            
            // Rerender the library to show the new image
            renderImageLibrary();
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
 * Creates and adds a thumbnail to the appropriate carousel group.
 * This function is now designed to be called by renderImageLibrary.
 * @param {Object} imageData - The staged image data.
 * @param {HTMLElement} groupContainer - The container for the scale group.
 */
function addThumbnail(imageData, groupContainer) {
    // Create thumbnail container
    const thumbnail = document.createElement('div');
    thumbnail.className = 'relative group flex-shrink-0';
    thumbnail.setAttribute('data-id', imageData.id);
    
    // Calculate thumbnail dimensions
    const aspect = imageData.width / imageData.height;
    const thumbHeight = THUMBNAIL_HEIGHT; // 180px
    const thumbWidth = Math.round(thumbHeight * aspect);
    
    const img = document.createElement('img');
    img.src = imageData.src;
    img.className = 'rounded-lg cursor-pointer transition-all duration-200 border-4';
    img.style.height = `${thumbHeight}px`;
    img.style.width = `${thumbWidth}px`;
    img.style.objectFit = 'cover';
    img.alt = imageData.file.name;
    img.title = `Name: ${imageData.file.name}\nDimensions: ${imageData.width}x${imageData.height}`;
    
    // Set border based on selection
    img.style.borderColor = imageData.selected ? '#e91e63' : 'transparent';

    // Main controls overlay (Add, Rotate, Delete)
    const mainControls = document.createElement('div');
    mainControls.className = 'absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition flex flex-col space-y-1';

    const addToCanvasBtn = document.createElement('button');
    addToCanvasBtn.className = 'text-white bg-black bg-opacity-40 p-1 rounded-full hover:bg-green-600';
    addToCanvasBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>';
    addToCanvasBtn.title = 'Add to canvas';

    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'text-white bg-black bg-opacity-40 p-1 rounded-full hover:bg-gray-600';
    rotateBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
    rotateBtn.title = 'Rotate image';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-white bg-black bg-opacity-40 p-1 rounded-full hover:bg-red-600';
    deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
    deleteBtn.title = 'Remove from library';

    mainControls.appendChild(addToCanvasBtn);
    mainControls.appendChild(rotateBtn);
    mainControls.appendChild(deleteBtn);
    
    // Scale controls overlay
    const scaleControls = document.createElement('div');
    scaleControls.className = 'thumbnail-controls p-2 flex flex-col justify-center gap-1 text-xs';

    const scaleFactors = [
        [0.25, 0.5, 0.75],
        [1, 1.5, 2]
    ];
    
    scaleFactors.forEach(rowFactors => {
        const row = document.createElement('div');
        row.className = 'flex justify-center gap-1';
        rowFactors.forEach(factor => {
            const scaleBtn = document.createElement('button');
            scaleBtn.innerText = factor + 'x';
            const isActive = factor === (imageData.scaleFactor || 1);
            scaleBtn.className = `px-2 py-0.5 rounded-sm flex-1 transition ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 bg-opacity-70 hover:bg-gray-500 text-white'}`;
            scaleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateImageScale(imageData.id, factor);
            });
            row.appendChild(scaleBtn);
        });
        scaleControls.appendChild(row);
    });

    // Add event listeners
    img.addEventListener('click', () => toggleImageSelection(imageData.id));
    addToCanvasBtn.addEventListener('click', (e) => { e.stopPropagation(); addSingleImageToCanvas(imageData); });
    rotateBtn.addEventListener('click', (e) => { e.stopPropagation(); rotateImage(imageData.id); });
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); removeImage(imageData.id); });
    
    thumbnail.appendChild(img);
    thumbnail.appendChild(mainControls);
    thumbnail.appendChild(scaleControls);
    groupContainer.appendChild(thumbnail);
}

/**
 * Updates the scale factor for an image and re-renders the library.
 * @param {string} id - The image ID.
 * @param {number} newScale - The new scale factor.
 */
function updateImageScale(id, newScale) {
    let imageToUpdate = null;
    ['portrait', 'landscape'].forEach(type => {
        const img = stagedImages[type].find(i => i.id === id);
        if (img) {
            imageToUpdate = img;
        }
    });

    if (imageToUpdate) {
        imageToUpdate.scaleFactor = newScale;
        console.log(`Updated scale for image ${id} to ${newScale}x`);
        renderImageLibrary(); // Re-render the entire library to regroup
        
        // Highlight the updated thumbnail
        setTimeout(() => {
            const newThumbnail = document.querySelector(`[data-id="${id}"]`);
            if (newThumbnail) {
                newThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                const imgElement = newThumbnail.querySelector('img');
                if (imgElement) {
                    imgElement.classList.add('ring-4', 'ring-blue-500', 'transition-all', 'duration-500');
                    setTimeout(() => {
                        imgElement.classList.remove('ring-4', 'ring-blue-500');
                    }, 1000);
                }
            }
        }, 100);
    }
}

/**
 * Renders the entire image library, grouping images by orientation and scale.
 */
function renderImageLibrary() {
    renderOrientationSection('portrait');
    renderOrientationSection('landscape');
    updateSelectionVisuals(); // Ensure selection visuals are correct after re-render
}

/**
 * Renders a specific orientation section (portrait or landscape)
 * @param {string} type - 'portrait' or 'landscape'
 */
function renderOrientationSection(type) {
    const container = type === 'portrait' ? portraitContainer : landscapeContainer;
    container.innerHTML = ''; // Clear existing content

    const images = stagedImages[type];
    if (images.length === 0) {
        container.innerHTML = `<div class="text-center w-full text-gray-400 italic py-16">No ${type} images yet</div>`;
        return;
    }

    // Group images by scale factor
    const grouped = images.reduce((acc, img) => {
        const scale = img.scaleFactor || 1;
        if (!acc[scale]) {
            acc[scale] = [];
        }
        acc[scale].push(img);
        return acc;
    }, {});

    // Sort scales and render each group
    const sortedScales = Object.keys(grouped).sort((a, b) => parseFloat(a) - parseFloat(b));
    
    sortedScales.forEach(scale => {
        const group = grouped[scale];
        
        // Create main container for this scale group
        const scaleGroupContainer = document.createElement('div');
        scaleGroupContainer.className = 'scale-group';
        
        // Create and add the header (e.g., "✅ 1x (9)")
        const header = document.createElement('div');
        header.className = 'scale-group-header';
        header.innerHTML = `✓ ${scale}x (${group.length})`;
        scaleGroupContainer.appendChild(header);

        // Create a container for the images within this group
        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'scale-group-images';

        // Add each image thumbnail to this group
        group.forEach(imageData => {
            addThumbnail(imageData, imagesContainer);
        });

        scaleGroupContainer.appendChild(imagesContainer);
        container.appendChild(scaleGroupContainer);
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
        
        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;
        
        let scale;
        if (imgAspect > targetAspect) {
             scale = targetWidth / img.width; // Image is wider, fit to width
        } else {
             scale = targetHeight / img.height; // Image is taller, fit to height
        }
        
        // Apply user-selected scale factor
        const userScaleFactor = imageData.scaleFactor || 1;
        const scaleX = scale * userScaleFactor;
        const scaleY = scale * userScaleFactor;
        
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
    renderImageLibrary();
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
        if (img) {
            img.style.borderColor = selectedImages.includes(id) ? '#e91e63' : 'transparent';
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
            
            // Rerender the entire library
            renderImageLibrary();
            
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
    
    ['portrait', 'landscape'].forEach(type => {
        const imageIndex = stagedImages[type].findIndex(img => img.id === id);
        if (imageIndex >= 0) {
            found = true;
            
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
        // Rebuild the library
        renderImageLibrary();
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
 * Handles file drop event for the staging area
 */
function handleStagingFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('bg-base-300');
    if (fileErrorMsg) {
        fileErrorMsg.style.display = 'none';
    }
    
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
    activeTemplateObject = null; // Reset the active template
    selectedTemplateIdentifier = null; // Reset the selected identifier
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

    // Temporarily hide grid lines and remove clipping for export
    gridLines.forEach(line => line.set({ visible: false }));
    fabricCanvas.getObjects().forEach(obj => obj.set('clipPath', null));

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
        // Restore grid lines visibility and clipping
        gridLines.forEach(line => line.set({ visible: true }));
        fabricCanvas.getObjects().forEach(applyCellClipping);

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
        if (activeTemplateObject) {
            applyMosaicTemplate(activeTemplateObject.identifier);
        }
    });

    // Staging area drop zone listeners
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('bg-base-300');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('bg-base-300');
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
    autoArrangeBtn.addEventListener('click', () => autoArrangeImages(false));
    
    // Clear selection button
    if(clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearSelection);
    }

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
            document.querySelectorAll('.mosaic-template').forEach(t => {
                t.classList.remove('border-secondary', 'ring-2', 'ring-secondary');
            });
            const clickedButton = e.currentTarget;
            clickedButton.classList.add('border-secondary', 'ring-2', 'ring-secondary');
            
            const templateValue = clickedButton.getAttribute('data-template');
            selectedTemplateIdentifier = templateValue; // Set the identifier

            if (templateValue === 'custom') {
                customGridControls.style.display = 'grid';
            } else {
                customGridControls.style.display = 'none';
            }
        });
    });
    
    // Apply mosaic button
    applyMosaicButton.addEventListener('click', () => {
        if (selectedTemplateIdentifier) {
            applyMosaicTemplate(selectedTemplateIdentifier);
            // After applying a template, also update the fit to cell button status
            handleObjectSelection();
        } else {
            showFileError('Please select a template first.');
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
            if (activeTemplateObject) {
                applyMosaicTemplate(activeTemplateObject.identifier);
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

    // Fit to cell button
    fitToCellBtn.addEventListener('click', fitSelectedObjectToCell);

    // Contextual Cell Action listeners
    centerInCellBtn.addEventListener('click', centerInCell);
    fillCellBtn.addEventListener('click', fillCell);

    fabricCanvas.on('selection:created', handleObjectSelection);
    fabricCanvas.on('selection:updated', handleObjectSelection);
    fabricCanvas.on('selection:cleared', handleObjectDeselection);

    fabricCanvas.on('object:modified', (e) => {
        const obj = e.target;
        if (!obj || !activeTemplateObject) {
            // If the object is dropped and there is no active template,
            // ensure it has no grid data.
            if (obj && typeof obj.gridRow !== 'undefined') {
                obj.set({ gridRow: undefined, gridCol: undefined });
                applyCellClipping(obj); // This will remove the clip path
                obj.setCoords();
                fabricCanvas.renderAll();
            }
            return;
        }

        const { cellWidth, cellHeight, cols, rows } = activeTemplateObject;
        const center = obj.getCenterPoint();

        // Determine the target cell from the drop location
        const targetCol = Math.floor(center.x / cellWidth);
        const targetRow = Math.floor(center.y / cellHeight);

        // Check if the drop is outside the grid
        if (targetCol < 0 || targetCol >= cols || targetRow < 0 || targetRow >= rows) {
            // Object was dropped outside the grid, so remove its grid properties
            if (typeof obj.gridRow !== 'undefined') {
                obj.set({ gridRow: undefined, gridCol: undefined });
                applyCellClipping(obj); // This will remove the clip path
                obj.setCoords();
                fabricCanvas.renderAll();
            }
            return;
        }

        // Find if another object is already in the target cell
        const targetObject = fabricCanvas.getObjects().find(other => {
            return other !== obj && other.gridRow === targetRow && other.gridCol === targetCol;
        });

        if (targetObject) {
            // If dropping on another object, swap them
            swapObjects(obj, targetObject);
        } else {
            // If dropping on an empty cell or resizing within a cell,
            // update its position and clipping.
            const padding = (parseInt(templatePaddingInput.value, 10) || 0) - PADDING_OFFSET;
            const targetX = targetCol * cellWidth + padding;
            const targetY = targetRow * cellHeight + padding;
            const targetWidth = cellWidth - (padding * 2);
            const targetHeight = cellHeight - (padding * 2);

            // Update grid position data
            obj.set({
                gridRow: targetRow,
                gridCol: targetCol
            });

            // Re-center the object within the cell.
            // This is desirable for both dropping and resizing to maintain alignment.
            obj.set({
                 left: targetX + (targetWidth - obj.getScaledWidth()) / 2,
                 top: targetY + (targetHeight - obj.getScaledHeight()) / 2,
            });

            // ALWAYS apply clipping after determining the cell
            applyCellClipping(obj);
            obj.setCoords();
        }
        fabricCanvas.renderAll();
    });

    templatePaddingInput.addEventListener('input', () => {
        if(activeTemplateObject) {
            autoArrangeImages(true); // Re-apply the layout with new padding
        }
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
