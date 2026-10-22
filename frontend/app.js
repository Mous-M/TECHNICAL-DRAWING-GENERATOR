'use strict';

/* ============================================================
   TECHNICAL DRAWING GENERATOR
   Complete frontend application engine.

   Includes:
   - 2D drafting, grid, snapping, zoom and pan
   - Walls, doors, windows and rooms
   - Furniture, kitchen and bathroom fixtures
   - Electrical components and columns
   - Dimensions, selection and editable properties
   - Custom object colours
   - Mirror and trim tools
   - Undo and redo
   - Save, load, rename, delete and manage old drawings
   - PNG, JSON and SVG export
   - Printing
   - AI assistant connection through POST /api/ai
   - Voice commands
   - 3D preview and basic first-person navigation
   - Keyboard shortcuts
   ============================================================ */

(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    const canvas = $('drawingCanvas');

    if (!canvas) {
        console.error(
            'Technical Drawing Generator: #drawingCanvas was not found.'
        );
        return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('Could not initialise the drawing canvas.');
        return;
    }

    const MM_PER_PIXEL = 20;
    const GRID = 25;
    const STORAGE_KEY = 'technicalDrawingProjects';
    const CURRENT_KEY = 'technicalDrawingCurrent';
    const AI_ENDPOINT = '/api/ai';

    const TYPES = [
        'walls',
        'doors',
        'windows',
        'rooms',
        'furniture',
        'kitchen',
        'bathroom',
        'columns',
        'electrical',
        'dimensions'
    ];

    // Word-inspired theme and standard colours, including useful tints/shades.
    const COLORS = [
        '#FFFFFF','#F2F2F2','#D9E2F3','#B4C7E7','#8EAADB','#4472C4','#2F5597',
        '#DDEBF7','#BDD7EE','#9BC2E6','#5B9BD5','#2E75B6','#1F4E78',
        '#E2F0D9','#C6E0B4','#A9D18E','#70AD47','#548235','#375623',
        '#FFF2CC','#FFE699','#FFD966','#FFC000','#BF9000','#7F6000',
        '#FCE4D6','#F8CBAD','#F4B183','#ED7D31','#C65911','#843C0C',
        '#F4CCCC','#EA9999','#E06666','#CC0000','#990000','#660000',
        '#E4DFEC','#D9EAD3','#C9DAF8','#CFE2F3','#D9D2E9','#EAD1DC',
        '#7030A0','#8064A2','#A5A5A5','#7F7F7F','#595959','#262626',
        '#00B0F0','#00B050','#92D050','#FFFF00','#FF0000','#FF00FF',
        '#00FFFF','#0000FF','#000080','#008080','#008000','#800000','#800080','#808000','#C0C0C0','#000000'
    ];

    const FURNITURE = {
        bed: [2000, 1500],
        singlebed: [1900, 900],
        doublebed: [2000, 1500],
        sofa: [2000, 850],
        chair: [450, 450],
        table: [1200, 800],
        desk: [1200, 600],
        wardrobe: [1200, 600],
        cupboard: [900, 450],
        bookshelf: [900, 300],
        television: [1000, 100],
        fridge: [700, 700],
        refrigerator: [700, 700],
        washingmachine: [600, 600],
        diningtable: [1500, 900],
        coffeetable: [900, 600],
        deskchair: [500, 500],
        cabinet: [900, 450]
    };

    const FIXTURES = {
        toilet: [700, 700],
        sink: [600, 500],
        basin: [600, 500],
        shower: [900, 900],
        bathtub: [1700, 750],
        mirror: [600, 80],
        bidet: [600, 600],
        urinal: [400, 400]
    };

    const el = {
        coords: $('coords'),
        status: $('statusBar'),
        currentTool: $('currentTool'),
        commandInput: $('commandInput'),
        noSelection: $('noSelection'),

        wallProperties: $('wallProperties'),
        wallLength: $('wallLength'),
        wallThickness: $('wallThickness'),
        wallLayer: $('wallLayer'),
        applyProperties: $('applyProperties'),
        deleteObject: $('deleteObject'),

        doorProperties: $('doorProperties'),
        doorType: $('doorType'),
        doorWidth: $('doorWidth'),
        doorOpening: $('doorOpening'),
        applyDoorProperties: $('applyDoorProperties'),
        deleteDoor: $('deleteDoor'),

        windowProperties: $('windowProperties'),
        windowWidth: $('windowWidth'),
        applyWindowProperties: $('applyWindowProperties'),
        deleteWindow: $('deleteWindow'),

        furnitureProperties: $('furnitureProperties'),
        furnitureType: $('furnitureType'),
        furnitureWidth: $('furnitureWidth'),
        furnitureDepth: $('furnitureDepth'),
        furnitureRotation: $('furnitureRotation'),
        applyFurnitureProperties: $('applyFurnitureProperties'),
        deleteFurniture: $('deleteFurniture'),

        bathroomProperties: $('bathroomProperties'),
        bathroomType: $('bathroomType'),
        bathroomWidth: $('bathroomWidth'),
        bathroomDepth: $('bathroomDepth'),
        bathroomRotation: $('bathroomRotation'),
        applyBathroomProperties: $('applyBathroomProperties'),
        deleteBathroom: $('deleteBathroom'),

        roomProperties: $('roomProperties'),
        roomType: $('roomType'),
        roomWidth: $('roomWidth'),
        roomDepth: $('roomDepth'),
        roomName: $('roomName'),
        applyRoomProperties: $('applyRoomProperties'),
        deleteRoom: $('deleteRoom'),

        dimensionProperties: $('dimensionProperties'),
        dimensionValue: $('dimensionValue'),
        dimensionText: $('dimensionText'),
        applyDimensionProperties: $('applyDimensionProperties'),
        deleteDimension: $('deleteDimension'),

        kitchenProperties: $('kitchenProperties'),
        kitchenType: $('kitchenType'),
        kitchenWidth: $('kitchenWidth'),
        kitchenDepth: $('kitchenDepth'),
        kitchenRotation: $('kitchenRotation'),
        applyKitchenProperties: $('applyKitchenProperties'),
        deleteKitchen: $('deleteKitchen'),

        electricalProperties: $('electricalProperties'),
        electricalType: $('electricalType'),
        electricalRotation: $('electricalRotation'),
        applyElectricalProperties: $('applyElectricalProperties'),
        deleteElectrical: $('deleteElectrical'),

        columnProperties: $('columnProperties'),
        columnShape: $('columnShape'),
        columnWidth: $('columnWidth'),
        columnDepth: $('columnDepth'),
        applyColumnProperties: $('applyColumnProperties'),
        deleteColumn: $('deleteColumn')
    };

    let drawing = emptyDrawing();
    let activeTool = 'select';
    let selected = null;

    let pointer = null;
    let drawingStart = null;
    let dragState = null;
    let panState = null;
    let cableStart = null;

    let zoom = 1;
    let pan = { x: 0, y: 0 };

    let gridVisible = true;
    let snapGrid = true;
    let snapWalls = true;
    let dimensionsVisible = true;

    let undoStack = [];
    let redoStack = [];
    let historyLock = false;

    let recognition = null;
    let listening = false;

    let activeProjectName = 'Untitled Drawing';
    let currentColor = '#f2f2f2';

    let threeView = null;

    const clamp = (n, min, max) =>
        Math.max(min, Math.min(max, n));

    const clone = value =>
        JSON.parse(JSON.stringify(value));

    const toPixels = millimetres =>
        Number(millimetres || 0) / MM_PER_PIXEL;

    const toMM = pixels =>
        Number(pixels || 0) * MM_PER_PIXEL;

    const distance = (a, b) =>
        Math.hypot(b.x - a.x, b.y - a.y);

    const normalise = value =>
        String(value || '')
            .toLowerCase()
            .replace(/[\s_-]/g, '');

    function emptyDrawing() {
        return {
            version: 2,
            walls: [],
            doors: [],
            windows: [],
            rooms: [],
            furniture: [],
            kitchen: [],
            bathroom: [],
            columns: [],
            electrical: [],
            dimensions: [],
            settings: {
                gridVisible: true,
                snapGrid: true,
                snapWalls: true,
                dimensionsVisible: true
            }
        };
    }

    function setStatus(message) {
        if (el.status) {
            el.status.dataset.message = message;
            el.status.title = message;
        }

        if (el.currentTool) {
            el.currentTool.textContent =
                `Tool: ${activeTool.toUpperCase()} — ${message}`;
        }

        console.info('[Technical Drawing]', message);
    }

    function setToolStatus() {
        if (el.currentTool) {
            el.currentTool.textContent =
                `Tool: ${activeTool.toUpperCase()}`;
        }

        document.querySelectorAll('.tool[data-tool]')
            .forEach(button => {
                button.classList.toggle(
                    'active',
                    button.dataset.tool === activeTool
                );
            });
    }

    function getScreenPoint(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left - pan.x) / zoom,
            y: (event.clientY - rect.top - pan.y) / zoom
        };
    }

    function snapPoint(point) {
        let result = { ...point };

        if (snapGrid && activeTool !== 'select') {
            result.x = Math.round(result.x / GRID) * GRID;
            result.y = Math.round(result.y / GRID) * GRID;
        }

        if (
            snapWalls &&
            ['wall', 'door', 'window'].includes(activeTool)
        ) {
            let nearest = null;
            let bestDistance = 12;

            for (const wall of drawing.walls) {
                for (const p of [
                    { x: wall.x1, y: wall.y1 },
                    { x: wall.x2, y: wall.y2 }
                ]) {
                    const d = distance(result, p);

                    if (d < bestDistance) {
                        bestDistance = d;
                        nearest = p;
                    }
                }
            }

            if (nearest) result = { ...nearest };
        }

        return result;
    }

    function checkpoint() {
        if (historyLock) return;

        undoStack.push(JSON.stringify(serialiseDrawing()));

        if (undoStack.length > 80) {
            undoStack.shift();
        }

        redoStack.length = 0;
    }

    function serialiseDrawing() {
        const wallIndices = new Map(
            drawing.walls.map((wall, index) => [wall, index])
        );

        const result = {
            version: 2,
            settings: {
                gridVisible,
                snapGrid,
                snapWalls,
                dimensionsVisible
            }
        };

        for (const type of TYPES) {
            result[type] = drawing[type].map(object => {
                if (
                    type === 'doors' ||
                    type === 'windows'
                ) {
                    const copy = { ...object };

                    copy.wallIndex = wallIndices.get(object.wall);

                    delete copy.wall;

                    return copy;
                }

                return clone(object);
            });
        }

        return result;
    }

    function restoreDrawing(source) {
        if (!source || typeof source !== 'object') {
            throw new Error('The drawing file is invalid.');
        }

        const restored = emptyDrawing();

        for (const type of TYPES) {
            if (Array.isArray(source[type])) {
                restored[type] = source[type].map(clone);
            }
        }

        drawing = restored;

        drawing.settings = {
            ...restored.settings,
            ...(source.settings || {})
        };

        gridVisible =
            drawing.settings.gridVisible !== false;

        snapGrid =
            drawing.settings.snapGrid !== false;

        snapWalls =
            drawing.settings.snapWalls !== false;

        dimensionsVisible =
            drawing.settings.dimensionsVisible !== false;

        for (const opening of [
            ...drawing.doors,
            ...drawing.windows
        ]) {
            if (Number.isInteger(opening.wallIndex)) {
                opening.wall =
                    drawing.walls[opening.wallIndex];
            }

            delete opening.wallIndex;
        }

        selected = null;

        refreshProperties();
        redraw();
    }

    function undo() {
        if (!undoStack.length) {
            setStatus('Nothing to undo.');
            return;
        }

        historyLock = true;

        redoStack.push(JSON.stringify(serialiseDrawing()));

        restoreDrawing(JSON.parse(undoStack.pop()));

        historyLock = false;

        setStatus('Undo completed.');
    }

    function redo() {
        if (!redoStack.length) {
            setStatus('Nothing to redo.');
            return;
        }

        historyLock = true;

        undoStack.push(JSON.stringify(serialiseDrawing()));

        restoreDrawing(JSON.parse(redoStack.pop()));

        historyLock = false;

        setStatus('Redo completed.');
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();

        const width = Math.max(
            1,
            Math.round(rect.width || canvas.clientWidth || 800)
        );

        const height = Math.max(
            1,
            Math.round(rect.height || canvas.clientHeight || 600)
        );

        const ratio = Math.max(
            1,
            window.devicePixelRatio || 1
        );

        if (canvas.width !== width * ratio) {
            canvas.width = width * ratio;
        }

        if (canvas.height !== height * ratio) {
            canvas.height = height * ratio;
        }

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

        redraw();
    }

    function screenTransform() {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
    }

    function drawGrid() {
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 600;

        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);

        if (!gridVisible) return;

        const left = -pan.x / zoom;
        const top = -pan.y / zoom;
        const right = left + width / zoom;
        const bottom = top + height / zoom;

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        ctx.lineWidth = 1 / zoom;

        for (
            let x = Math.floor(left / GRID) * GRID;
            x <= right + GRID;
            x += GRID
        ) {
            const major =
                Math.round(x / GRID) % 5 === 0;

            ctx.strokeStyle =
                major ? '#3b3b3b' : '#292929';

            ctx.beginPath();
            ctx.moveTo(x + 0.5, top);
            ctx.lineTo(x + 0.5, bottom);
            ctx.stroke();
        }

        for (
            let y = Math.floor(top / GRID) * GRID;
            y <= bottom + GRID;
            y += GRID
        ) {
            const major =
                Math.round(y / GRID) % 5 === 0;

            ctx.strokeStyle =
                major ? '#3b3b3b' : '#292929';

            ctx.beginPath();
            ctx.moveTo(left, y + 0.5);
            ctx.lineTo(right, y + 0.5);
            ctx.stroke();
        }

        ctx.restore();
    }

    function isSelected(type, object) {
        return selected &&
            selected.type === type &&
            selected.object === object;
    }

    function objectColour(type, object, fallback) {
        if (isSelected(type, object)) {
            return '#ffe08a';
        }

        return object.color || fallback;
    }

    function drawWall(wall) {
        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const length = Math.hypot(dx, dy);

        if (!length) return;

        const nx = -dy / length;
        const ny = dx / length;

        const half = Math.max(
            1,
            toPixels(wall.thickness || 200) / 2
        );

        const cuts = [];

        for (const opening of [
            ...drawing.doors,
            ...drawing.windows
        ]) {
            if (opening.wall !== wall) continue;

            const halfWidth =
                toPixels(opening.width || 900) / length / 2;

            cuts.push({
                a: clamp(opening.t - halfWidth, 0, 1),
                b: clamp(opening.t + halfWidth, 0, 1)
            });
        }

        cuts.sort((a, b) => a.a - b.a);

        const spans = [];
        let t = 0;

        for (const cut of cuts) {
            if (cut.a > t) spans.push([t, cut.a]);
            t = Math.max(t, cut.b);
        }

        if (t < 1) spans.push([t, 1]);

        if (!cuts.length) spans.push([0, 1]);

        ctx.save();

        ctx.fillStyle = objectColour(
            'wall',
            wall,
            '#d7d7d7'
        );

        ctx.strokeStyle = ctx.fillStyle;

        for (const [a, b] of spans) {
            if (b <= a) continue;

            const ax = wall.x1 + dx * a;
            const ay = wall.y1 + dy * a;
            const bx = wall.x1 + dx * b;
            const by = wall.y1 + dy * b;

            ctx.beginPath();
            ctx.moveTo(ax + nx * half, ay + ny * half);
            ctx.lineTo(bx + nx * half, by + ny * half);
            ctx.lineTo(bx - nx * half, by - ny * half);
            ctx.lineTo(ax - nx * half, ay - ny * half);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    function drawDoor(door) {
        const wall = door.wall;
        if (!wall) return;

        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const wallLength = Math.hypot(dx, dy);
        if (wallLength < 0.001) return;

        const ux = dx / wallLength;
        const uy = dy / wallLength;
        const nx = -uy;
        const ny = ux;
        const wallAngle = Math.atan2(uy, ux);
        const width = Math.max(8, toPixels(Number(door.width) || 900));
        const t = clamp(Number(door.t) || 0, 0, 1);
        const centre = { x: wall.x1 + dx * t, y: wall.y1 + dy * t };
        const left = { x: centre.x - ux * width / 2, y: centre.y - uy * width / 2 };
        const right = { x: centre.x + ux * width / 2, y: centre.y + uy * width / 2 };
        const kind = normalise(door.type || 'single');
        const opening = normalise(door.opening || 'left');
        const swing = normalise(door.swing || 'inward');
        const side = /out|exterior|outside/.test(swing) ? -1 : 1;
        const isArch = /arch|openway|opening/.test(kind);
        const isPocket = /pocket/.test(kind);
        const isSliding = /sliding|bypass|surface|closet/.test(kind);
        const isDouble = /double|french/.test(kind);
        const isBifold = /bifold|bi.?fold/.test(kind);

        ctx.save();
        ctx.strokeStyle = objectColour('door', door, '#343A40');
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Opening-only symbols have no hinged leaf or swing arc.
        if (isArch) {
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(left.x, left.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
            ctx.restore();
            return;
        }

        // Sliding panels travel parallel to the wall, never on a swing arc.
        if (isSliding || isPocket) {
            const rail = Math.max(3, toPixels(55));
            const offset = isPocket ? Math.max(5, width * 0.75) : rail;
            ctx.beginPath();
            ctx.moveTo(left.x + nx * offset, left.y + ny * offset);
            ctx.lineTo(right.x + nx * offset, right.y + ny * offset);
            ctx.moveTo(left.x - nx * rail, left.y - ny * rail);
            ctx.lineTo(right.x - nx * rail, right.y - ny * rail);
            if (/bypass|closet/.test(kind)) {
                ctx.moveTo(left.x + nx * offset * 1.8, left.y + ny * offset * 1.8);
                ctx.lineTo(right.x + nx * offset * 1.8, right.y + ny * offset * 1.8);
            }
            if (isPocket) {
                // Dashed pocket run indicates the panel retracting into the wall.
                ctx.setLineDash([4, 3]);
                const pocketEnd = { x: right.x + ux * width * 0.8, y: right.y + uy * width * 0.8 };
                ctx.moveTo(right.x, right.y);
                ctx.lineTo(pocketEnd.x, pocketEnd.y);
            }
            ctx.stroke();
            ctx.restore();
            return;
        }

        // The swing target is derived from the wall normal, not from the
        // screen's clockwise direction. This keeps inward/outward consistent
        // when a wall is drawn in the opposite direction. Each arc ends at
        // exactly the same angle as its leaf.
        const drawLeaf = (hinge, closedAngle, leafWidth, hingeDirection) => {
            // Each leaf rotates 90 degrees from its closed position toward the
            // selected side of the wall. Opposite jambs therefore swing in the
            // same inward/outward direction without sharing an incorrect arc.
            const openAngle = closedAngle + hingeDirection * side * Math.PI / 2;
            const delta = Math.atan2(
                Math.sin(openAngle - closedAngle),
                Math.cos(openAngle - closedAngle)
            );
            const tip = {
                x: hinge.x + Math.cos(openAngle) * leafWidth,
                y: hinge.y + Math.sin(openAngle) * leafWidth
            };
            ctx.beginPath();
            ctx.moveTo(hinge.x, hinge.y);
            ctx.lineTo(tip.x, tip.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(hinge.x, hinge.y, leafWidth, closedAngle, openAngle, delta < 0);
            ctx.stroke();
        };

        if (isBifold) {
            const half = width / 2;
            const foldOffset = Math.max(5, half * 0.34);
            const a = { x: left.x + nx * side * foldOffset, y: left.y + ny * side * foldOffset };
            const b = { x: centre.x - nx * side * foldOffset, y: centre.y - ny * side * foldOffset };
            const c = { x: centre.x + nx * side * foldOffset, y: centre.y + ny * side * foldOffset };
            const d = { x: right.x - nx * side * foldOffset, y: right.y - ny * side * foldOffset };
            ctx.beginPath();
            ctx.moveTo(left.x, left.y); ctx.lineTo(a.x, a.y); ctx.lineTo(centre.x, centre.y);
            ctx.lineTo(d.x, d.y); ctx.lineTo(right.x, right.y);
            ctx.moveTo(centre.x, centre.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
            ctx.stroke();
            ctx.restore();
            return;
        }

        if (isDouble) {
            // Double/French leaves meet at the centre and hinge at opposite jambs.
            const leafWidth = width / 2;
            drawLeaf(left, wallAngle, leafWidth, 1);
            drawLeaf(right, wallAngle + Math.PI, leafWidth, -1);
        } else {
            // 'left' and 'right' describe the hinge jamb; swing side is separate.
            if (opening === 'right' || opening === 'right-hand' || opening === 'righthand') {
                drawLeaf(right, wallAngle + Math.PI, width, -1);
            } else {
                drawLeaf(left, wallAngle, width, 1);
            }
        }
        ctx.restore();
    }

    function drawWindow(windowObject) {
        const wall = windowObject.wall;

        if (!wall) return;

        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const length = Math.hypot(dx, dy);

        if (!length) return;

        const ux = dx / length;
        const uy = dy / length;

        const width = toPixels(windowObject.width || 1200);

        const cx = wall.x1 + dx * windowObject.t;
        const cy = wall.y1 + dy * windowObject.t;

        const a = {
            x: cx - ux * width / 2,
            y: cy - uy * width / 2
        };

        const b = {
            x: cx + ux * width / 2,
            y: cy + uy * width / 2
        };

        ctx.save();

        ctx.strokeStyle = objectColour(
            'window',
            windowObject,
            '#67c8ff'
        );

        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        ctx.lineWidth = 1;

        const nx = -uy * 4;
        const ny = ux * 4;

        ctx.beginPath();
        ctx.moveTo(a.x + nx, a.y + ny);
        ctx.lineTo(b.x + nx, b.y + ny);
        ctx.moveTo(a.x - nx, a.y - ny);
        ctx.lineTo(b.x - nx, b.y - ny);
        ctx.stroke();

        ctx.restore();
    }

    function drawBox(type, object, fallback = '#c3c3c3') {
        const width = Math.max(6, toPixels(object.width || 600));
        const height = Math.max(6, toPixels(object.depth || object.height || 600));
        const kind = normalise(object.type || object.label || type);
        const ink = objectColour(type, object, fallback);
        const x = -width / 2, y = -height / 2;
        const minSide = Math.min(width, height);

        ctx.save();
        ctx.translate(object.x, object.y);
        ctx.rotate((Number(object.rotation) || 0) * Math.PI / 180);
        ctx.strokeStyle = ink;
        ctx.fillStyle = ink;
        ctx.lineWidth = 1.35;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const rect = (rx, ry, rw, rh, fill = false) => {
            if (rw <= 0 || rh <= 0) return;
            if (fill) { ctx.globalAlpha = 0.14; ctx.fillRect(rx, ry, rw, rh); ctx.globalAlpha = 1; }
            ctx.strokeRect(rx, ry, rw, rh);
        };
        const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
        const ellipse = (ex, ey, rx, ry, fill = false) => {
            ctx.beginPath(); ctx.ellipse(ex, ey, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2);
            if (fill) { ctx.globalAlpha = 0.12; ctx.fill(); ctx.globalAlpha = 1; }
            ctx.stroke();
        };
        const roundRect = (rx, ry, rw, rh, r) => {
            ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, Math.min(r, rw / 2, rh / 2)); ctx.stroke();
        };

        if (/bed|mattress/.test(kind)) {
            rect(x, y, width, height, true);
            // Headboard and separate pillows, oriented to the top edge.
            rect(x, y, width, Math.max(4, height * 0.09));
            const pillowW = width * (kind.includes('single') ? 0.34 : 0.28);
            const pillowH = height * 0.17;
            roundRect(x + width * 0.08, y + height * 0.12, pillowW, pillowH, 3);
            if (!kind.includes('single') && width > height * 1.2) roundRect(x + width * 0.62, y + height * 0.12, pillowW, pillowH, 3);
            line(x + width * 0.06, y + height * 0.34, x + width * 0.94, y + height * 0.34);
        } else if (/sofa|couch|loveseat|settee/.test(kind)) {
            roundRect(x, y, width, height, Math.max(3, minSide * 0.08));
            rect(x + width * 0.06, y + height * 0.08, width * 0.12, height * 0.84);
            rect(x + width * 0.82, y + height * 0.08, width * 0.12, height * 0.84);
            const seats = kind.includes('loveseat') ? 2 : Math.max(2, Math.min(4, Math.round(width / Math.max(1, height * 0.75))));
            for (let i = 0; i < seats; i++) rect(x + width * 0.2 + i * width * 0.6 / seats, y + height * 0.1, width * 0.58 / seats, height * 0.8);
            line(x + width * 0.18, y + height * 0.56, x + width * 0.82, y + height * 0.56);
        } else if (/chair|stool|armchair/.test(kind)) {
            roundRect(x, y, width, height, minSide * 0.12);
            rect(x + width * 0.12, y + height * 0.08, width * 0.76, height * 0.24);
            rect(x + width * 0.12, y + height * 0.36, width * 0.76, height * 0.52);
            if (/armchair/.test(kind)) { line(x + width * 0.06, y + height * 0.28, x + width * 0.06, y + height * 0.88); line(x + width * 0.94, y + height * 0.28, x + width * 0.94, y + height * 0.88); }
        } else if (/table|desk|workstation|island/.test(kind)) {
            rect(x, y, width, height, true);
            if (/dining|table/.test(kind)) {
                const leg = Math.max(3, minSide * 0.08);
                [[x+width*.12,y+height*.12],[x+width*.88-leg,y+height*.12],[x+width*.12,y+height*.88-leg],[x+width*.88-leg,y+height*.88-leg]].forEach(p=>rect(p[0],p[1],leg,leg));
            } else {
                line(x + width * 0.08, y + height * 0.18, x + width * 0.92, y + height * 0.18);
                rect(x + width * 0.08, y + height * 0.2, width * 0.84, height * 0.13);
            }
        } else if (/wardrobe|cupboard|cabinet|bookshelf|shelf|dresser|drawer/.test(kind)) {
            rect(x, y, width, height, true);
            const vertical = width >= height;
            if (vertical) {
                line(0, y, 0, y + height);
                ellipse(-width * .06, 0, 1.8, 1.8); ellipse(width * .06, 0, 1.8, 1.8);
            } else {
                const shelves = Math.max(2, Math.min(5, Math.round(height / Math.max(1, width * .35))));
                for (let i=1;i<shelves;i++) line(x, y + height*i/shelves, x+width, y + height*i/shelves);
            }
        } else if (/toilet|wc/.test(kind)) {
            rect(x + width*.12, y + height*.02, width*.76, height*.28);
            roundRect(x + width*.19, y + height*.25, width*.62, height*.68, minSide*.28);
            ellipse(0, y + height*.58, width*.2, height*.24);
        } else if (/sink|basin|washbasin|lavatory/.test(kind)) {
            rect(x, y, width, height, true);
            roundRect(x + width*.14, y + height*.14, width*.72, height*.68, minSide*.2);
            ellipse(0, y + height*.48, width*.09, height*.1);
            line(-width*.08, y + height*.08, width*.08, y + height*.08);
        } else if (/bathtub|bath/.test(kind)) {
            roundRect(x, y, width, height, minSide*.18);
            roundRect(x + width*.08, y + height*.1, width*.84, height*.8, minSide*.16);
            ellipse(x + width*.13, y + height*.17, 2.5, 2.5);
        } else if (/shower/.test(kind)) {
            rect(x, y, width, height);
            line(x, y, x+width, y+height); line(x+width, y, x, y+height);
            ellipse(x+width*.5, y+height*.5, minSide*.12, minSide*.12);
        } else if (/fridge|refrigerator|freezer/.test(kind)) {
            rect(x, y, width, height, true);
            line(x, y + height*.42, x+width, y + height*.42);
            line(x+width*.82, y+height*.12, x+width*.82, y+height*.32);
            line(x+width*.82, y+height*.55, x+width*.82, y+height*.82);
        } else if (/washer|washingmachine|dryer|dishwasher/.test(kind)) {
            rect(x, y, width, height, true);
            ellipse(0, height*.08, width*.1, height*.035);
            ellipse(0, height*.53, minSide*.3, minSide*.3);
        } else if (/stove|cooker|hob|range|oven/.test(kind)) {
            rect(x, y, width, height, true);
            const r = Math.max(2, minSide*.12);
            [[-.25,-.24],[.25,-.24],[-.25,.24],[.25,.24]].forEach(p=>ellipse(width*p[0],height*p[1],r,r));
            if (/oven|cooker|range/.test(kind)) rect(x+width*.16, y+height*.68, width*.68, height*.2);
        } else if (/counter|worktop|kitchenunit|baseunit|wallunit|cabinet/.test(kind)) {
            rect(x, y, width, height, true);
            const across = width >= height;
            const n = Math.max(2, Math.min(6, Math.round((across ? width : height) / Math.max(1, toPixels(600)))));
            for (let i=1;i<n;i++) across ? line(x+width*i/n,y,x+width*i/n,y+height) : line(x,y+height*i/n,x+width,y+height*i/n);
            if (/sink/.test(kind)) { roundRect(x+width*.2,y+height*.18,width*.42,height*.64,minSide*.1); ellipse(x+width*.41,y+height*.5,2,2); }
        } else if (/tv|television|monitor|screen/.test(kind)) {
            rect(x, y, width, height);
            line(-width*.2, height*.1, width*.2, height*.1);
        } else if (/mirror/.test(kind)) {
            rect(x, y, width, height);
            line(x+width*.15,y+height*.15,x+width*.85,y+height*.85);
        } else if (/bidet|urinal/.test(kind)) {
            roundRect(x+width*.15,y+height*.08,width*.7,height*.84,minSide*.22);
            ellipse(0, 0, width*.17, height*.2);
        } else {
            // Neutral technical outline for any custom or future object type.
            rect(x, y, width, height, true);
            line(x, y, x+width, y+height);
            line(x+width, y, x, y+height);
        }

        // Keep labels out of the symbol itself: small unobtrusive caption below it.
        const caption = object.label || object.type || '';
        if (caption && minSide > 28 && width > 30 && height > 24 && object.showLabel === true) {
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = ink;
            ctx.fillText(String(caption), 0, height / 2 + 11, Math.max(24, width * 1.5));
        }
        ctx.restore();
    }

    function drawRoom(room) {
        ctx.save();

        ctx.strokeStyle = objectColour(
            'room',
            room,
            '#7d9e8d'
        );

        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;

        ctx.strokeRect(
            room.x,
            room.y,
            room.width,
            room.height
        );

        ctx.setLineDash([]);

        ctx.fillStyle = room.color || '#b5d4c5';
        ctx.font = '12px Arial';

        ctx.fillText(
            room.name || 'ROOM',
            room.x + 5,
            room.y + 16
        );

        ctx.restore();
    }

    function drawColumn(column) {
        const width = toPixels(column.width || column.size || 300);
        const depth = toPixels(column.depth || column.size || 300);

        ctx.save();

        ctx.translate(column.x, column.y);
        ctx.rotate((Number(column.rotation) || 0) * Math.PI / 180);

        ctx.fillStyle = objectColour(
            'column',
            column,
            '#555555'
        );

        ctx.strokeStyle = ctx.fillStyle;

        if (/^(circle|circular|round|rounded)$/.test(normalise(column.shape || 'square'))) {
            ctx.beginPath();
            ctx.ellipse(
                0,
                0,
                width / 2,
                depth / 2,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(-width / 2, -depth / 2, width, depth);
            ctx.strokeRect(-width / 2, -depth / 2, width, depth);
        }

        ctx.restore();
    }

    function drawElectrical(object) {
        ctx.save();

        ctx.translate(object.x, object.y);
        ctx.rotate((Number(object.rotation) || 0) * Math.PI / 180);

        ctx.strokeStyle = objectColour(
            'electrical',
            object,
            '#ffd166'
        );

        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1.5;

        const r = 8;

        switch (normalise(object.type)) {
            case 'light':
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.moveTo(-r - 3, 0);
                ctx.lineTo(r + 3, 0);
                ctx.moveTo(0, -r - 3);
                ctx.lineTo(0, r + 3);
                ctx.stroke();
                break;

            case 'socket':
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(-3, 0, 1.5, 0, Math.PI * 2);
                ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'switch':
                ctx.strokeRect(-r, -r, r * 2, r * 2);
                ctx.beginPath();
                ctx.moveTo(-r / 2, r / 2);
                ctx.lineTo(r / 2, -r / 2);
                ctx.stroke();
                break;

            case 'fan':
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.stroke();

                for (let i = 0; i < 4; i++) {
                    ctx.save();
                    ctx.rotate(i * Math.PI / 2);
                    ctx.beginPath();
                    ctx.ellipse(0, -r, 3, 6, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                break;

            case 'cable':
            case 'wire':
                if (object.end) {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(
                        object.end.x - object.x,
                        object.end.y - object.y
                    );
                    ctx.stroke();
                }
                break;

            default:
                ctx.strokeRect(-r, -r, r * 2, r * 2);
                ctx.fillText(object.type || 'ELECTRICAL', r + 3, 4);
        }

        ctx.restore();
    }

    function drawDimension(dimension) {
        if (!dimension.start || !dimension.end) return;

        const a = dimension.start;
        const b = dimension.end;

        ctx.save();

        ctx.strokeStyle = objectColour(
            'dimension',
            dimension,
            '#e5e5e5'
        );

        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const tick = 5;

        for (const p of [a, b]) {
            ctx.beginPath();

            ctx.moveTo(
                p.x - Math.cos(angle + Math.PI / 4) * tick,
                p.y - Math.sin(angle + Math.PI / 4) * tick
            );

            ctx.lineTo(
                p.x + Math.cos(angle + Math.PI / 4) * tick,
                p.y + Math.sin(angle + Math.PI / 4) * tick
            );

            ctx.stroke();
        }

        const label = dimension.text ||
            `${Math.round(dimension.value ?? distance(a, b) * MM_PER_PIXEL)} mm`;

        ctx.font = '12px Arial';
        ctx.fillText(
            label,
            (a.x + b.x) / 2 + 5,
            (a.y + b.y) / 2 - 5
        );

        ctx.restore();
    }

    function drawPreview(a, b) {
        ctx.save();

        ctx.strokeStyle = '#8fdfff';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;

        ctx.beginPath();

        if (activeTool === 'wall' || activeTool === 'dimension') {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        } else if (
            ['room', 'kitchen', 'trim'].includes(activeTool)
        ) {
            ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
        } else {
            ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        }

        ctx.stroke();
        ctx.restore();
    }

    function redraw() {
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 600;

        ctx.clearRect(0, 0, width, height);

        drawGrid();
        screenTransform();

        drawing.rooms.forEach(drawRoom);
        drawing.walls.forEach(drawWall);
        drawing.doors.forEach(drawDoor);
        drawing.windows.forEach(drawWindow);

        drawing.furniture.forEach(o => drawBox('furniture', o));
        drawing.kitchen.forEach(o => drawBox('kitchen', o, '#c6b6a0'));
        drawing.bathroom.forEach(o => drawBox('bathroom', o, '#8bcfd0'));

        drawing.columns.forEach(drawColumn);
        drawing.electrical.forEach(drawElectrical);

        if (dimensionsVisible) {
            drawing.dimensions.forEach(drawDimension);
        }

        if (drawingStart && pointer) {
            drawPreview(drawingStart, pointer);
        }

        ctx.restore();
    }

    function getCollections() {
        return [
            ['wall', drawing.walls],
            ['door', drawing.doors],
            ['window', drawing.windows],
            ['room', drawing.rooms],
            ['furniture', drawing.furniture],
            ['kitchen', drawing.kitchen],
            ['bathroom', drawing.bathroom],
            ['column', drawing.columns],
            ['electrical', drawing.electrical],
            ['dimension', drawing.dimensions]
        ];
    }

    function distanceToSegment(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const lengthSquared = dx * dx + dy * dy;

        if (!lengthSquared) return distance(p, a);

        const t = clamp(
            ((p.x - a.x) * dx + (p.y - a.y) * dy) /
                lengthSquared,
            0,
            1
        );

        return distance(p, {
            x: a.x + t * dx,
            y: a.y + t * dy
        });
    }

    function hitTest(point) {
        const tolerance = 10 / zoom;

        for (const type of [
            'dimensions',
            'electrical',
            'columns',
            'bathroom',
            'kitchen',
            'furniture',
            'windows',
            'doors',
            'rooms',
            'walls'
        ]) {
            const objects = drawing[type];

            for (let i = objects.length - 1; i >= 0; i--) {
                const object = objects[i];

                if (type === 'walls') {
                    if (
                        distanceToSegment(
                            point,
                            { x: object.x1, y: object.y1 },
                            { x: object.x2, y: object.y2 }
                        ) <= tolerance + toPixels(object.thickness || 200) / 2
                    ) {
                        return { type: 'wall', object };
                    }
                } else if (
                    type === 'doors' ||
                    type === 'windows'
                ) {
                    if (!object.wall) continue;

                    const wall = object.wall;

                    const centre = {
                        x: wall.x1 + (wall.x2 - wall.x1) * object.t,
                        y: wall.y1 + (wall.y2 - wall.y1) * object.t
                    };

                    if (
                        distance(point, centre) <=
                        toPixels(object.width || 900) / 2 + tolerance
                    ) {
                        return {
                            type: type === 'doors' ? 'door' : 'window',
                            object
                        };
                    }
                } else if (type === 'rooms') {
                    // Rooms store x/y at the top-left corner; furniture uses
                    // centre coordinates. Select by the room's true bounds.
                    const left = Math.min(object.x, object.x + (object.width || 0));
                    const right = Math.max(object.x, object.x + (object.width || 0));
                    const top = Math.min(object.y, object.y + (object.height || 0));
                    const bottom = Math.max(object.y, object.y + (object.height || 0));
                    if (point.x >= left - tolerance && point.x <= right + tolerance &&
                        point.y >= top - tolerance && point.y <= bottom + tolerance) {
                        return { type: 'room', object };
                    }
                } else if (type === 'dimensions') {
                    if (
                        distanceToSegment(
                            point,
                            object.start,
                            object.end
                        ) <= tolerance
                    ) {
                        return { type: 'dimension', object };
                    }
                } else if (
                    type === 'electrical'
                ) {
                    if (distance(point, object) <= 14 + tolerance) {
                        return { type: 'electrical', object };
                    }
                } else if (type === 'columns') {
                    const w = toPixels(object.width || object.size || 300);
                    const h = toPixels(object.depth || object.size || 300);

                    if (
                        Math.abs(point.x - object.x) <= w / 2 + tolerance &&
                        Math.abs(point.y - object.y) <= h / 2 + tolerance
                    ) {
                        return { type: 'column', object };
                    }
                } else {
                    const x = object.x;
                    const y = object.y;

                    const w = object.width || 600;
                    const h = object.height || object.depth || 600;

                    if (
                        point.x >= x - toPixels(w) / 2 - tolerance &&
                        point.x <= x + toPixels(w) / 2 + tolerance &&
                        point.y >= y - toPixels(h) / 2 - tolerance &&
                        point.y <= y + toPixels(h) / 2 + tolerance
                    ) {
                        const singularType = {
                            rooms: 'room',
                            furniture: 'furniture',
                            kitchen: 'kitchen',
                            bathroom: 'bathroom',
                            electrical: 'electrical',
                            columns: 'column',
                            dimensions: 'dimension',
                            doors: 'door',
                            windows: 'window',
                            walls: 'wall'
                        }[type] || type;
                        return { type: singularType, object };
                    }
                }
            }
        }

        return null;
    }

    function nearestWall(point) {
        let best = null;
        let bestDistance = Infinity;

        for (const wall of drawing.walls) {
            const d = distanceToSegment(
                point,
                { x: wall.x1, y: wall.y1 },
                { x: wall.x2, y: wall.y2 }
            );

            if (d < bestDistance) {
                bestDistance = d;
                best = wall;
            }
        }

        return bestDistance < 30 / zoom ? best : null;
    }

    function createWall(a, b, thickness = 200) {
        if (distance(a, b) < 3) return null;

        const wall = {
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            thickness: Number(thickness) || 200,
            layer: 'Wall',
            color: currentColor
        };

        drawing.walls.push(wall);

        return wall;
    }

    function placeOpening(type, point) {
        const wall = nearestWall(point);

        if (!wall) {
            setStatus(`Draw a wall first, then place the ${type}.`);
            return;
        }

        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;

        const lengthSquared = dx * dx + dy * dy;

        const t = clamp(
            ((point.x - wall.x1) * dx +
                (point.y - wall.y1) * dy) / lengthSquared,
            0.05,
            0.95
        );

        const object = {
            wall,
            t,
            width: type === 'door' ? Number(el.doorWidth?.value) || 900 : 1200,
            type: type === 'door' ? (el.doorType?.value || 'single') : 'standard',
            opening: type === 'door' ? (el.doorOpening?.value || 'left') : 'left',
            swing: type === 'door' ? ($('doorSwing')?.value || 'inward') : 'inward',
            color: currentColor
        };

        if (type === 'door') {
            drawing.doors.push(object);
        } else {
            drawing.windows.push(object);
        }

        selected = { type, object };

        refreshProperties();
        redraw();

        setStatus(`${type} placed.`);
    }

    function placeBox(type, point, values = {}) {
        let width = 600;
        let depth = 600;

        if (type === 'furniture') {
            const key = normalise(values.type || 'chair');
            const size = FURNITURE[key] || [600, 600];

            width = size[0];
            depth = size[1];
        }

        if (type === 'bathroom') {
            const key = normalise(values.type || 'toilet');
            const size = FIXTURES[key] || [600, 600];

            width = size[0];
            depth = size[1];
        }

        if (type === 'kitchen') {
            width = 1200;
            depth = 600;
        }

        const object = {
            x: point.x,
            y: point.y,
            width: Number(values.width) || width,
            depth: Number(values.depth) || depth,
            rotation: Number(values.rotation) || 0,
            type: values.type || (
                type === 'kitchen' ? 'counter' :
                type === 'bathroom' ? 'toilet' : 'chair'
            ),
            color: currentColor
        };

        drawing[type].push(object);

        selected = { type, object };

        refreshProperties();
        redraw();

        setStatus(`${object.type} placed.`);
    }

    function placeRoom(a, b, isKitchen = false) {
        const width = Math.abs(b.x - a.x);
        const height = Math.abs(b.y - a.y);

        if (width < 5 || height < 5) return;

        if (isKitchen) {
            placeBox(
                'kitchen',
                {
                    x: Math.min(a.x, b.x) + width / 2,
                    y: Math.min(a.y, b.y) + height / 2
                },
                {
                    type: 'counter',
                    width: Math.round(toMM(width)),
                    depth: Math.round(toMM(height))
                }
            );

            return;
        }

        const room = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width,
            height,
            name: 'Room',
            type: 'bedroom',
            color: currentColor
        };

        drawing.rooms.push(room);

        selected = { type: 'room', object: room };

        refreshProperties();
        redraw();

        setStatus('Room created.');
    }

    function placeColumn(point) {
        const object = {
            x: point.x,
            y: point.y,
            width: 300,
            depth: 300,
            size: 300,
            shape: 'square',
            rotation: 0,
            color: currentColor
        };

        drawing.columns.push(object);

        selected = { type: 'column', object };

        refreshProperties();
        redraw();

        setStatus('Column placed.');
    }

    function placeElectrical(point) {
        const type = window.__electricalMode || 'light';

        if (type === 'cable' && cableStart) {
            const object = {
                type: 'cable',
                x: cableStart.x,
                y: cableStart.y,
                end: { ...point },
                rotation: 0,
                color: currentColor
            };

            drawing.electrical.push(object);

            selected = { type: 'electrical', object };
            cableStart = null;

            refreshProperties();
            redraw();

            setStatus('Cable drawn.');

            return;
        }

        if (type === 'cable') {
            cableStart = { ...point };
            setStatus('Click the cable endpoint.');
            return;
        }

        const object = {
            type,
            x: point.x,
            y: point.y,
            rotation: 0,
            color: currentColor
        };

        drawing.electrical.push(object);

        selected = { type: 'electrical', object };

        refreshProperties();
        redraw();

        setStatus(`${type} placed.`);
    }

    function selectObject(hit) {
        selected = hit;
        refreshProperties();
        redraw();
    }

    function getPanelForType(type) {
        const map = {
            wall: el.wallProperties,
            door: el.doorProperties,
            window: el.windowProperties,
            room: el.roomProperties,
            furniture: el.furnitureProperties,
            kitchen: el.kitchenProperties,
            bathroom: el.bathroomProperties,
            column: el.columnProperties,
            electrical: el.electricalProperties,
            dimension: el.dimensionProperties
        };

        return map[type] || null;
    }

    function setInputValue(element, value) {
        if (element && value !== undefined && value !== null) {
            element.value = value;
        }
    }

    function refreshProperties() {
        const panels = [
            el.wallProperties,
            el.doorProperties,
            el.windowProperties,
            el.roomProperties,
            el.furnitureProperties,
            el.kitchenProperties,
            el.bathroomProperties,
            el.columnProperties,
            el.electricalProperties,
            el.dimensionProperties
        ].filter(Boolean);

        panels.forEach(panel => {
            panel.style.display = 'none';
        });

        if (el.noSelection) {
            el.noSelection.style.display = selected ? 'none' : '';
        }

        if (!selected) return;

        const { type, object } = selected;
        const panel = getPanelForType(type);

        if (panel) panel.style.display = 'block';

        if (type === 'wall') {
            setInputValue(
                el.wallLength,
                Math.round(toMM(distance(
                    { x: object.x1, y: object.y1 },
                    { x: object.x2, y: object.y2 }
                )))
            );

            setInputValue(el.wallThickness, object.thickness || 200);
            setInputValue(el.wallLayer, object.layer || 'Wall');
        }

        if (type === 'door') {
            setInputValue(el.doorType, object.type || 'single');
            setInputValue(el.doorWidth, object.width || 900);
            setInputValue(el.doorOpening, object.opening || 'left');
            setInputValue($('doorSwing'), object.swing || 'inward');
        }

        if (type === 'window') {
            setInputValue(el.windowWidth, object.width || 1200);
        }

        if ([
            'furniture',
            'kitchen',
            'bathroom'
        ].includes(type)) {
            const prefix = type;

            setInputValue(
                el[`${prefix}Type`],
                object.type
            );

            setInputValue(
                el[`${prefix}Width`],
                object.width
            );

            setInputValue(
                el[`${prefix}Depth`],
                object.depth
            );

            setInputValue(
                el[`${prefix}Rotation`],
                object.rotation || 0
            );
        }

        if (type === 'room') {
            setInputValue(el.roomType, object.type || 'bedroom');
            setInputValue(el.roomWidth, Math.round(toMM(object.width)));
            setInputValue(el.roomDepth, Math.round(toMM(object.height)));
            setInputValue(el.roomName, object.name || 'Room');
        }

        if (type === 'column') {
            setInputValue(el.columnShape, object.shape || 'square');
            setInputValue(el.columnWidth, object.width || object.size || 300);
            setInputValue(el.columnDepth, object.depth || object.size || 300);
        }

        if (type === 'electrical') {
            setInputValue(el.electricalType, object.type || 'light');
            setInputValue(el.electricalRotation, object.rotation || 0);
        }

        if (type === 'dimension') {
            setInputValue(
                el.dimensionValue,
                Math.round(object.value ?? distance(object.start, object.end) * MM_PER_PIXEL)
            );

            setInputValue(el.dimensionText, object.text || '');
        }

        ensureColourControls();
        syncColourInput();
    }

    function deleteSelected() {
        if (!selected) {
            setStatus('Select an object first.');
            return;
        }

        checkpoint();

        const { type, object } = selected;

        const map = {
            wall: 'walls',
            door: 'doors',
            window: 'windows',
            room: 'rooms',
            furniture: 'furniture',
            kitchen: 'kitchen',
            bathroom: 'bathroom',
            column: 'columns',
            electrical: 'electrical',
            dimension: 'dimensions'
        };

        const collection = drawing[map[type]];

        if (collection) {
            const index = collection.indexOf(object);

            if (index >= 0) collection.splice(index, 1);
        }

        if (type === 'wall') {
            drawing.doors = drawing.doors.filter(
                item => item.wall !== object
            );

            drawing.windows = drawing.windows.filter(
                item => item.wall !== object
            );
        }

        selected = null;

        refreshProperties();
        redraw();

        setStatus('Object deleted.');
    }

    function updateSelected(values) {
        if (!selected) {
            setStatus('Select an object first.');
            return;
        }

        checkpoint();

        Object.assign(selected.object, values);

        refreshProperties();
        redraw();

        setStatus('Properties updated.');
    }

    function applyPropertyPanels() {
        const apply = (id, callback) => {
            const button = $(id);

            if (button) {
                button.addEventListener('click', callback);
            }
        };

        apply('applyProperties', () => {
            if (!selected || selected.type !== 'wall') return;

            const wall = selected.object;

            const oldLength = distance(
                { x: wall.x1, y: wall.y1 },
                { x: wall.x2, y: wall.y2 }
            );

            const newLength = toPixels(
                Number(el.wallLength?.value) || toMM(oldLength)
            );

            const factor = oldLength ? newLength / oldLength : 1;

            updateSelected({
                x2: wall.x1 + (wall.x2 - wall.x1) * factor,
                y2: wall.y1 + (wall.y2 - wall.y1) * factor,
                thickness: Number(el.wallThickness?.value) || 200,
                layer: el.wallLayer?.value || 'Wall'
            });
        });

        apply('applyDoorProperties', () => {
            if (!selected || selected.type !== 'door') return;

            updateSelected({
                type: el.doorType?.value || 'single',
                width: Number(el.doorWidth?.value) || 900,
                opening: el.doorOpening?.value || 'left',
                swing: $('doorSwing')?.value || 'inward'
            });
        });

        apply('applyWindowProperties', () => {
            if (!selected || selected.type !== 'window') return;

            updateSelected({
                width: Number(el.windowWidth?.value) || 1200
            });
        });

        for (const type of [
            'furniture',
            'kitchen',
            'bathroom'
        ]) {
            apply(`apply${type[0].toUpperCase()}${type.slice(1)}Properties`, () => {
                if (!selected || selected.type !== type) return;

                updateSelected({
                    type: el[`${type}Type`]?.value || selected.object.type,
                    width: Number(el[`${type}Width`]?.value) || selected.object.width,
                    depth: Number(el[`${type}Depth`]?.value) || selected.object.depth,
                    rotation: Number(el[`${type}Rotation`]?.value) || 0
                });
            });
        }

        apply('applyRoomProperties', () => {
            if (!selected || selected.type !== 'room') return;

            updateSelected({
                type: el.roomType?.value || 'bedroom',
                name: el.roomName?.value || 'Room',
                width: toPixels(Number(el.roomWidth?.value) || 4000),
                height: toPixels(Number(el.roomDepth?.value) || 3000)
            });
        });

        apply('applyColumnProperties', () => {
            if (!selected || selected.type !== 'column') return;

            updateSelected({
                shape: /^(circle|circular|round|rounded)$/.test(normalise(el.columnShape?.value || 'square')) ? 'circle' : 'square',
                width: Number(el.columnWidth?.value) || 300,
                depth: Number(el.columnDepth?.value) || 300
            });
        });

        apply('applyElectricalProperties', () => {
            if (!selected || selected.type !== 'electrical') return;

            updateSelected({
                type: el.electricalType?.value || 'light',
                rotation: Number(el.electricalRotation?.value) || 0
            });
        });

        apply('applyDimensionProperties', () => {
            if (!selected || selected.type !== 'dimension') return;

            updateSelected({
                value: Number(el.dimensionValue?.value) || 0,
                text: el.dimensionText?.value || ''
            });
        });

        for (const id of [
            'deleteObject',
            'deleteDoor',
            'deleteWindow',
            'deleteFurniture',
            'deleteBathroom',
            'deleteRoom',
            'deleteDimension',
            'deleteKitchen',
            'deleteElectrical',
            'deleteColumn'
        ]) {
            apply(id, deleteSelected);
        }
    }

    /* ========================================================
       COLOUR PALETTE
       ======================================================== */

    function ensureColourControls() {
        if ($('objectColorControls')) return;

        const panel = $('propertyPanel');

        if (!panel) return;

        const section = document.createElement('section');

        section.id = 'objectColorControls';

        section.className = 'object-colour-section';

        section.innerHTML = `
            <div class="colour-heading">
                <h3>Object colour</h3>
                <span class="colour-heading-note">CUSTOMISE</span>
            </div>
            <label class="custom-colour-label" for="customObjectColor">
                Custom colour
                <input id="customObjectColor" type="color" value="#F4F1EA">
            </label>
            <div class="palette-caption">ARCHITECTURAL PALETTE</div>
            <div id="objectColorPalette" aria-label="Object colour presets"></div>
            <button id="applyObjectColor" class="apply-colour-button" type="button">Apply colour</button>
        `;

        panel.appendChild(section);

        const palette = $('objectColorPalette');

        COLORS.forEach(color => {
            const button = document.createElement('button');

            button.type = 'button';
            button.title = color;
            button.setAttribute('aria-label', `Set object colour ${color}`);
            button.className = 'colour-swatch';
            button.style.setProperty('--swatch-colour', color);

            button.addEventListener('click', () => {
                $('customObjectColor').value = color;
                currentColor = color;
                palette.querySelectorAll('.colour-swatch').forEach(swatch => {
                    swatch.classList.toggle('is-current', swatch.title === color);
                });
                applySelectedColour();
            });

            palette.appendChild(button);
        });

        $('customObjectColor').addEventListener('input', event => {
            currentColor = event.target.value;
        });

        $('applyObjectColor').addEventListener('click', applySelectedColour);
    }

    function syncColourInput() {
        const input = $('customObjectColor');

        if (input && selected?.object?.color) {
            input.value = selected.object.color;
        }
    }

    function applySelectedColour() {
        if (!selected) {
            setStatus('Select an object before changing its colour.');
            return;
        }

        checkpoint();

        selected.object.color =
            $('customObjectColor')?.value || currentColor;

        currentColor = selected.object.color;

        redraw();

        setStatus('Object colour changed.');
    }

    /* ========================================================
       SAVE AND FILE MANAGEMENT
       ======================================================== */

    function getProjects() {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY) || '{}'
            );
        } catch {
            return {};
        }
    }

    function saveProject(name = activeProjectName) {
        const cleanName = String(name || '').trim();

        if (!cleanName) {
            setStatus('Enter a name for this drawing.');
            return;
        }

        const projects = getProjects();

        projects[cleanName] = {
            name: cleanName,
            updatedAt: new Date().toISOString(),
            drawing: serialiseDrawing()
        };

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(projects)
            );

            localStorage.setItem(CURRENT_KEY, cleanName);

            activeProjectName = cleanName;

            setStatus(`Saved "${cleanName}".`);
        } catch (error) {
            alert(
                'The drawing could not be saved in browser storage. ' +
                'Export a JSON copy to keep your work.\n\n' +
                error.message
            );
        }
    }

    function loadProject(name) {
        const projects = getProjects();
        const project = projects[name];

        if (!project || !project.drawing) {
            setStatus('Saved drawing not found.');
            return;
        }

        checkpoint();

        restoreDrawing(project.drawing);

        activeProjectName = project.name || name;

        localStorage.setItem(CURRENT_KEY, activeProjectName);

        setStatus(`Opened "${activeProjectName}".`);
    }

    function renameProject(oldName, newName) {
        const projects = getProjects();
        const name = String(newName || '').trim();

        if (!projects[oldName] || !name) return false;

        if (oldName !== name && projects[name]) {
            alert('A drawing with that name already exists.');
            return false;
        }

        projects[name] = {
            ...projects[oldName],
            name,
            updatedAt: new Date().toISOString()
        };

        if (oldName !== name) delete projects[oldName];

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(projects)
        );

        if (activeProjectName === oldName) {
            activeProjectName = name;
            localStorage.setItem(CURRENT_KEY, name);
        }

        return true;
    }

    function deleteProject(name) {
        const projects = getProjects();

        if (!projects[name]) return;

        if (!confirm(`Permanently delete "${name}"?`)) return;

        delete projects[name];

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(projects)
        );

        if (localStorage.getItem(CURRENT_KEY) === name) {
            localStorage.removeItem(CURRENT_KEY);
        }

        setStatus(`Deleted "${name}".`);

        showFileManager();
    }

    function showFileManager() {
        let modal = $('drawingFileManager');

        if (!modal) {
            modal = document.createElement('div');

            modal.id = 'drawingFileManager';

            modal.style.cssText = `
                position:fixed;
                inset:0;
                z-index:10000;
                background:rgba(0,0,0,.78);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
            `;

            modal.innerHTML = `
                <div style="
                    background:#202020;
                    color:#f2f2f2;
                    width:min(760px,100%);
                    max-height:85vh;
                    overflow:auto;
                    padding:22px;
                    border:1px solid #555;
                    border-radius:10px;
                ">
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                    ">
                        <h2 style="margin:0">My drawings</h2>
                        <button id="closeFileManager">Close</button>
                    </div>

                    <p>Open, rename or delete drawings saved in this browser.</p>

                    <div id="drawingFileList"></div>

                    <hr style="border-color:#444;margin:18px 0">

                    <label>
                        Drawing name
                        <input id="newDrawingName"
                               value="Untitled Drawing"
                               style="display:block;width:100%;padding:9px;margin-top:5px">
                    </label>

                    <button id="saveNamedDrawing" style="margin-top:10px">
                        Save current drawing as…
                    </button>

                    <button id="importDrawingJSON" style="margin-top:10px">
                        Import JSON file
                    </button>
                </div>
            `;

            document.body.appendChild(modal);

            $('closeFileManager').addEventListener('click', () => {
                modal.remove();
            });

            $('saveNamedDrawing').addEventListener('click', () => {
                const name = $('newDrawingName').value.trim();

                if (!name) {
                    alert('Enter a drawing name.');
                    return;
                }

                saveProject(name);
                showFileManager();
            });

            $('importDrawingJSON').addEventListener('click', importJSONFile);
        }

        const list = $('drawingFileList');

        list.innerHTML = '';

        const projects = getProjects();

        const names = Object.keys(projects).sort(
            (a, b) =>
                String(projects[b].updatedAt || '')
                    .localeCompare(String(projects[a].updatedAt || ''))
        );

        if (!names.length) {
            list.innerHTML = '<p>No saved drawings yet.</p>';
        }

        names.forEach(name => {
            const row = document.createElement('div');

            row.style.cssText = `
                display:flex;
                align-items:center;
                flex-wrap:wrap;
                gap:8px;
                padding:12px 0;
                border-bottom:1px solid #444;
            `;

            const label = document.createElement('div');

            label.style.cssText = 'flex:1;min-width:160px';

            label.innerHTML = `
                <strong></strong>
                <div style="font-size:12px;color:#aaa"></div>
            `;

            label.querySelector('strong').textContent = name;

            label.querySelector('div').textContent =
                projects[name].updatedAt
                    ? new Date(projects[name].updatedAt).toLocaleString()
                    : 'Saved drawing';

            const open = document.createElement('button');

            open.textContent = 'Open';

            open.addEventListener('click', () => {
                loadProject(name);
                modal.remove();
            });

            const rename = document.createElement('button');

            rename.textContent = 'Rename';

            rename.addEventListener('click', () => {
                const next = prompt('New drawing name:', name);

                if (next === null) return;

                if (renameProject(name, next)) {
                    showFileManager();
                }
            });

            const remove = document.createElement('button');

            remove.textContent = 'Delete';

            remove.addEventListener('click', () => {
                deleteProject(name);
            });

            row.append(label, open, rename, remove);

            list.appendChild(row);
        });

        const nameInput = $('newDrawingName');

        if (nameInput) nameInput.value = activeProjectName;
    }

    function importJSONFile() {
        const input = document.createElement('input');

        input.type = 'file';
        input.accept = '.json,application/json';

        input.addEventListener('change', async () => {
            const file = input.files?.[0];

            if (!file) return;

            try {
                const parsed = JSON.parse(await file.text());

                checkpoint();

                restoreDrawing(parsed);

                activeProjectName =
                    file.name.replace(/\.json$/i, '') ||
                    'Imported Drawing';

                setStatus('Drawing imported successfully.');
            } catch (error) {
                alert(`Could not import drawing: ${error.message}`);
            }
        });

        input.click();
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function exportJSON() {
        const blob = new Blob(
            [JSON.stringify(serialiseDrawing(), null, 2)],
            { type: 'application/json' }
        );

        downloadBlob(blob, `${activeProjectName}.json`);

        setStatus('JSON drawing exported.');
    }

    function exportPNG() {
        const link = document.createElement('a');

        link.download = `${activeProjectName}.png`;
        link.href = canvas.toDataURL('image/png');

        link.click();

        setStatus('PNG image exported.');
    }

    function exportSVG() {
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 600;

        const lines = [];

        lines.push(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
        );

        lines.push('<rect width="100%" height="100%" fill="#121212"/>');

        for (const wall of drawing.walls) {
            lines.push(
                `<line x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" stroke="${wall.color || '#ddd'}" stroke-width="${toPixels(wall.thickness || 200)}"/>`
            );
        }

        for (const type of [
            'furniture',
            'kitchen',
            'bathroom',
            'columns',
            'rooms'
        ]) {
            for (const object of drawing[type]) {
                const width = type === 'rooms'
                    ? object.width
                    : toPixels(object.width || object.size || 600);

                const height = type === 'rooms'
                    ? object.height
                    : toPixels(object.depth || object.size || 600);

                const x = type === 'rooms'
                    ? object.x
                    : object.x - width / 2;

                const y = type === 'rooms'
                    ? object.y
                    : object.y - height / 2;

                lines.push(
                    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${object.color || '#ddd'}"/>`
                );
            }
        }

        lines.push('</svg>');

        downloadBlob(
            new Blob([lines.join('\n')], { type: 'image/svg+xml' }),
            `${activeProjectName}.svg`
        );

        setStatus('SVG exported.');
    }

    function printDrawing() {
        const popup = window.open('', '_blank');

        if (!popup) {
            alert('Allow pop-ups to print your drawing.');
            return;
        }

        const image = canvas.toDataURL('image/png');

        popup.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>${escapeHTML(activeProjectName)}</title>
                <style>
                    @page { size: landscape; margin: 12mm; }
                    body { font-family: Arial, sans-serif; }
                    h2 { text-align: center; }
                    img { width: 100%; height: auto; object-fit: contain; }
                </style>
            </head>
            <body>
                <h2>${escapeHTML(activeProjectName)}</h2>
                <img src="${image}" alt="Technical drawing">
                <script>
                    window.onload = () => {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);

        popup.document.close();
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    /* ========================================================
       MIRROR AND TRIM
       ======================================================== */

    function mirrorSelected(axis = 'horizontal') {
        if (!selected) {
            setStatus('Select an object to mirror.');
            return;
        }

        checkpoint();

        const object = selected.object;

        if (selected.type === 'wall') {
            if (axis === 'horizontal') {
                [object.x1, object.x2] = [object.x2, object.x1];
            } else {
                [object.y1, object.y2] = [object.y2, object.y1];
            }
        } else if (selected.type === 'dimension') {
            [object.start, object.end] = [object.end, object.start];
        } else {
            object.rotation = (180 - (Number(object.rotation) || 0) + 360) % 360;
        }

        redraw();

        setStatus(`Object mirrored ${axis}.`);
    }

    function trimDrawing() {
        if (!selected) {
            setStatus('Select an object to trim.');
            return;
        }

        if (selected.type !== 'wall') {
            setStatus('Trim currently works on selected walls.');
            return;
        }

        const wall = selected.object;

        const intersections = [];

        const targetA = { x: wall.x1, y: wall.y1 };
        const targetB = { x: wall.x2, y: wall.y2 };
        const tx = targetB.x - targetA.x;
        const ty = targetB.y - targetA.y;
        const targetLenSq = tx * tx + ty * ty;

        for (const other of drawing.walls) {
            if (other === wall) continue;
            const ox = other.x2 - other.x1;
            const oy = other.y2 - other.y1;
            const denominator = tx * oy - ty * ox;
            if (Math.abs(denominator) < 0.00001) continue;
            const qx = other.x1 - targetA.x;
            const qy = other.y1 - targetA.y;
            const t = (qx * oy - qy * ox) / denominator;
            const u = (qx * ty - qy * tx) / denominator;
            // Intersection must lie on the selected wall; the other wall is
            // treated as a cutting edge and may be extended to its line.
            if (t < 0.001 || t > 0.999 || u < -0.001 || u > 1.001) continue;
            intersections.push({ x: targetA.x + t * tx, y: targetA.y + t * ty });
        }

        if (!intersections.length) {
            setStatus('No valid wall intersection found. Select a wall crossing another wall, then Trim.');
            return;
        }

        checkpoint();

        const a = { x: wall.x1, y: wall.y1 };
        const b = { x: wall.x2, y: wall.y2 };

        const closest = intersections.sort((p1, p2) => {
            const d1 = Math.min(distance(a, p1), distance(b, p1));
            const d2 = Math.min(distance(a, p2), distance(b, p2));
            return d1 - d2;
        })[0];

        if (distance(a, closest) < distance(b, closest)) {
            wall.x1 = closest.x;
            wall.y1 = closest.y;
        } else {
            wall.x2 = closest.x;
            wall.y2 = closest.y;
        }

        redraw();

        setStatus('Wall trimmed to its nearest intersection.');
    }

    function segmentIntersection(p1, p2, p3, p4) {
        const denominator =
            (p1.x - p2.x) * (p3.y - p4.y) -
            (p1.y - p2.y) * (p3.x - p4.x);

        if (Math.abs(denominator) < 0.00001) return null;

        const t = (
            (p1.x - p3.x) * (p3.y - p4.y) -
            (p1.y - p3.y) * (p3.x - p4.x)
        ) / denominator;

        const u = -(
            (p1.x - p2.x) * (p1.y - p3.y) -
            (p1.y - p2.y) * (p1.x - p3.x)
        ) / denominator;

        if (t < 0 || t > 1 || u < 0 || u > 1) {
            return null;
        }

        return {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
        };
    }

    /* ========================================================
       COMMANDS AND AI
       ======================================================== */

    function setTool(tool) {
        activeTool = tool;
        drawingStart = null;
        pointer = null;
        cableStart = null;

        setToolStatus();

        setStatus(`${tool} tool selected.`);

        redraw();
    }

    function chooseOption(select, requested) {
        if (!select) return;

        const target = normalise(requested);

        const match = [...select.options].find(option =>
            normalise(option.value) === target ||
            normalise(option.textContent) === target
        );

        if (match) select.value = match.value;
    }

    function generateLocalHousePlan(prompt) {
        const text = String(prompt || '').toLowerCase();
        if (!/(house|home|floor\s*plan|floorplan|bungalow|apartment|bedroom|living\s*room)/i.test(text) ||
            !/(create|make|draw|design|generate|build|plan|layout|need|want|with|house|home|floor\s*plan|floorplan|bungalow|apartment)/i.test(text)) return false;

        const bedroomMatch = text.match(/(\d+)\s*(?:bedroom|bed\s*room)s?/i);
        const bedroomCount = Math.max(1, Math.min(5, bedroomMatch ? Number(bedroomMatch[1]) : 3));
        const includeGarage = /garage|carport/.test(text);
        const includeStudy = /study|office/.test(text);
        const mm = value => toPixels(value);
        const cellW = mm(4000), cellH = mm(3200), gap = mm(0);
        const cols = 3;
        const rows = Math.ceil((bedroomCount + 4 + (includeStudy ? 1 : 0) + (includeGarage ? 1 : 0)) / cols);
        const names = ['Living Room', 'Kitchen', ...Array.from({length: bedroomCount}, (_,i)=>`Bedroom ${i+1}`), 'Bathroom', 'Dining Room'];
        if (includeStudy) names.push('Study');
        if (includeGarage) names.push('Garage');
        while (names.length < rows * cols) names.push('Hall');
        const totalW = cols * cellW, totalH = rows * cellH;
        const originX = Math.max(30, (canvas.clientWidth - totalW) / 2);
        const originY = Math.max(30, (canvas.clientHeight - totalH) / 2);
        const featureColors = {
            walls: '#4472C4', doors: '#ED7D31', windows: '#00B0F0', rooms: '#70AD47',
            furniture: '#8064A2', kitchen: '#FFC000', bathroom: '#00B0F0',
            columns: '#7F7F7F', electrical: '#FF00FF', dimensions: '#FFFFFF'
        };
        checkpoint();
        drawing = emptyDrawing();
        const roomRects = [];
        names.forEach((name, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const room = {
                x: originX + col * cellW, y: originY + row * cellH,
                width: cellW, height: cellH, name,
                type: /bedroom/.test(name.toLowerCase()) ? 'bedroom' : name.toLowerCase().replace(/\s+/g,'-'),
                color: featureColors.rooms
            };
            drawing.rooms.push(room); roomRects.push(room);
        });
        // Draw perimeter and shared partitions as real walls.
        const x0 = originX, y0 = originY, x1 = originX + totalW, y1 = originY + totalH;
        [[x0,y0,x1,y0],[x1,y0,x1,y1],[x1,y1,x0,y1],[x0,y1,x0,y0]].forEach(a => drawing.walls.push({x1:a[0],y1:a[1],x2:a[2],y2:a[3],thickness:200,layer:'Exterior wall',color:featureColors.walls}));
        for (let c=1;c<cols;c++) drawing.walls.push({x1:originX+c*cellW,y1:y0,x2:originX+c*cellW,y2:y1,thickness:150,layer:'Partition',color:featureColors.walls});
        for (let r=1;r<rows;r++) drawing.walls.push({x1:x0,y1:originY+r*cellH,x2:x1,y2:originY+r*cellH,thickness:150,layer:'Partition',color:featureColors.walls});
        // Attach hinged door objects to the nearest generated partition segment.
        const addDoor = (wall, t=.5, width=900, type='single') => drawing.doors.push({wall,t,width,type,opening:'left',swing:'inward',color:featureColors.doors});
        drawing.walls.slice(4).forEach(wall => addDoor(wall, .5, 900));
        const addBox = (collection, type, x, y, width, depth, color) => collection.push({type,x,y,width:toMM(width),depth:toMM(depth),rotation:0,color});
        roomRects.forEach(room => {
            const cx=room.x+room.width/2, cy=room.y+room.height/2, n=room.name.toLowerCase();
            if (n.includes('living')) {
                addBox(drawing.furniture,'sofa',cx,cy-room.height*.2,mm(2100),mm(850),featureColors.furniture);
                addBox(drawing.furniture,'coffeetable',cx,cy+room.height*.05,mm(900),mm(600),featureColors.furniture);
                addBox(drawing.furniture,'television',cx,room.y+room.height*.82,mm(1000),mm(120),featureColors.furniture);
            } else if (n.includes('kitchen')) {
                addBox(drawing.kitchen,'counter',room.x+room.width*.23,cy,mm(600),mm(2400),featureColors.kitchen);
                addBox(drawing.kitchen,'fridge',room.x+room.width*.68,room.y+room.height*.25,mm(700),mm(700),featureColors.kitchen);
                addBox(drawing.kitchen,'sink',room.x+room.width*.25,room.y+room.height*.72,mm(600),mm(500),featureColors.kitchen);
            } else if (n.includes('bedroom')) {
                addBox(drawing.furniture,'bed',cx,cy,mm(2000),mm(1500),featureColors.furniture);
                addBox(drawing.furniture,'wardrobe',room.x+room.width*.78,room.y+room.height*.2,mm(1200),mm(600),featureColors.furniture);
                addBox(drawing.furniture,'desk',room.x+room.width*.25,room.y+room.height*.78,mm(1000),mm(550),featureColors.furniture);
            } else if (n.includes('bathroom')) {
                addBox(drawing.bathroom,'toilet',room.x+room.width*.28,cy,mm(700),mm(700),featureColors.bathroom);
                addBox(drawing.bathroom,'sink',room.x+room.width*.68,room.y+room.height*.25,mm(600),mm(500),featureColors.bathroom);
                addBox(drawing.bathroom,'shower',room.x+room.width*.68,room.y+room.height*.72,mm(900),mm(900),featureColors.bathroom);
            } else if (n.includes('dining')) {
                addBox(drawing.furniture,'diningtable',cx,cy,mm(1500),mm(900),featureColors.furniture);
                [[-.22,-.2],[.22,-.2],[-.22,.2],[.22,.2]].forEach(([dx,dy])=>addBox(drawing.furniture,'chair',cx+room.width*dx,cy+room.height*dy,mm(450),mm(450),featureColors.furniture));
            } else if (n.includes('garage')) {
                addBox(drawing.furniture,'car',cx,cy,mm(4200),mm(1800),featureColors.furniture);
            } else if (n.includes('study')) {
                addBox(drawing.furniture,'desk',cx,cy,mm(1200),mm(600),featureColors.furniture);
                addBox(drawing.furniture,'deskchair',cx,cy+room.height*.2,mm(500),mm(500),featureColors.furniture);
            } else if (n.includes('hall')) {
                addBox(drawing.furniture,'console table',cx,cy,mm(900),mm(350),featureColors.furniture);
            }
            // Ceiling lights and sockets, colour-coded separately.
            drawing.electrical.push({type:'light',x:cx,y:cy,width:250,depth:250,rotation:0,color:featureColors.electrical});
            drawing.electrical.push({type:'socket',x:room.x+room.width*.1,y:cy,width:150,depth:150,rotation:0,color:featureColors.electrical});
        });
        // Exterior windows are attached to exterior walls, away from corners.
        const exterior = drawing.walls.slice(0,4);
        [exterior[0], exterior[2]].forEach((wall,i)=>drawing.windows.push({wall,t:i===0?.5:.5,width:1200,type:'standard',color:featureColors.windows}));
        // A main entrance on the left exterior wall.
        addDoor(exterior[3], .18, 1000, 'single');
        const dimensionY = y1 + mm(450);
        drawing.dimensions.push({start:{x:x0,y:dimensionY},end:{x:x1,y:dimensionY},value:Math.round(toMM(totalW)),text:'',color:featureColors.dimensions});
        selected = null; refreshProperties(); redraw();
        setStatus(`Local floor plan generated: ${bedroomCount} bedroom(s), rooms, furniture, electrical points, doors, windows and dimensions. Review all dimensions before construction.`);
        return true;
    }

    function isLikelyNaturalLanguageRequest(command) {
        return /\b(house|home|floor\s*plan|floorplan|bungalow|apartment|design|generate|explain|why|how|what|help me|make me|create me|build me|complete plan|full plan)\b/i.test(String(command || ''));
    }

    function runCommand(raw) {
        const command = String(raw || '').trim();

        if (!command) return false;

        const c = command.toLowerCase();

        if (generateLocalHousePlan(command)) return true;

        const number = (pattern, fallback) => {
            const match = c.match(pattern);

            if (!match) return fallback;

            let value = Number(match[1]);

            if (match[2] === 'm') value *= 1000;

            return value;
        };

        const centre = {
            x: Math.max(100, canvas.clientWidth / 2),
            y: Math.max(100, canvas.clientHeight / 2)
        };

        if (/^undo\b/.test(c)) {
            undo();
            return true;
        }

        if (/^redo\b/.test(c)) {
            redo();
            return true;
        }

        if (/^(select)\b/.test(c)) {
            setTool('select');
            return true;
        }

        if (/^(new|clear drawing|clear all)\b/.test(c)) {
            if (!confirm('Start a new drawing?')) return true;

            checkpoint();

            drawing = emptyDrawing();
            selected = null;

            refreshProperties();
            redraw();

            setStatus('New drawing created.');

            return true;
        }

        if (/^save\b/.test(c)) {
            saveProject();
            return true;
        }

        if (/^(files|my drawings|file manager)\b/.test(c)) {
            showFileManager();
            return true;
        }

        if (/^print\b/.test(c)) {
            printDrawing();
            return true;
        }

        if (/^export\b/.test(c)) {
            exportJSON();
            return true;
        }

        if (/\bmirror\b/.test(c)) {
            mirrorSelected(/\bvertical\b/.test(c) ? 'vertical' : 'horizontal');
            return true;
        }

        if (/\btrim\b/.test(c)) {
            trimDrawing();
            return true;
        }

        if (/\bgrid\b/.test(c)) {
            gridVisible = !/\b(off|hide)\b/.test(c);
            redraw();
            setStatus(`Grid ${gridVisible ? 'enabled' : 'disabled'}.`);
            return true;
        }

        if (/\bsnap\b/.test(c)) {
            snapGrid = !/\b(off|disable)\b/.test(c);
            setStatus(`Snapping ${snapGrid ? 'enabled' : 'disabled'}.`);
            return true;
        }

        if (/\bdimensions?\b/.test(c) && /\b(off|hide|on|show)\b/.test(c)) {
            dimensionsVisible = !/\b(off|hide)\b/.test(c);
            redraw();
            return true;
        }

        if (/\bwall\b/.test(c)) {
            const length = number(
                /wall\s*(\d+(?:\.\d+)?)\s*(mm|m)?/,
                5000
            );

            const thickness = number(
                /thick(?:ness)?\s*(\d+(?:\.\d+)?)\s*(mm|m)?/,
                200
            );

            checkpoint();

            const end = {
                x: centre.x + toPixels(length),
                y: centre.y
            };

            const wall = createWall(centre, end, thickness);

            if (wall) {
                selected = { type: 'wall', object: wall };
            }

            refreshProperties();
            redraw();

            return true;
        }

        if (/\bdoor\b/.test(c)) {
            setTool('door');
            return true;
        }

        if (/\bwindow\b/.test(c)) {
            setTool('window');
            return true;
        }

        if (/\broom\b/.test(c)) {
            checkpoint();

            placeRoom(
                centre,
                {
                    x: centre.x + toPixels(
                        number(/width\s*(\d+(?:\.\d+)?)\s*(mm|m)?/, 4000)
                    ),
                    y: centre.y + toPixels(
                        number(/depth\s*(\d+(?:\.\d+)?)\s*(mm|m)?/, 3000)
                    )
                }
            );

            return true;
        }

        if (/\bcolumn\b|\bpillar\b/.test(c)) {
            checkpoint();

            placeColumn(centre);

            const column = selected.object;

            column.width = number(
                /width\s*(\d+(?:\.\d+)?)\s*(mm|m)?/,
                300
            );

            column.depth = number(
                /depth\s*(\d+(?:\.\d+)?)\s*(mm|m)?/,
                column.width
            );

            column.shape = /\bcircle\b/.test(c) ? 'circle' : 'square';

            redraw();

            return true;
        }

        if (/\b(cable|wire|wiring)\b/.test(c)) {
            window.__electricalMode = 'cable';
            setTool('electrical');
            return true;
        }

        for (const type of [
            'light',
            'socket',
            'switch',
            'fan',
            'junction',
            'panel'
        ]) {
            if (new RegExp(`\\b${type}\\b`).test(c)) {
                checkpoint();

                window.__electricalMode = type;

                placeElectrical(centre);

                return true;
            }
        }

        for (const type of Object.keys(FIXTURES)) {
            if (c.includes(type)) {
                checkpoint();

                placeBox('bathroom', centre, { type });

                return true;
            }
        }

        for (const type of Object.keys(FURNITURE)) {
            if (c.includes(type)) {
                checkpoint();

                placeBox('furniture', centre, { type });

                return true;
            }
        }

        if (/\b(kitchen|counter|cabinet)\b/.test(c)) {
            checkpoint();

            placeBox('kitchen', centre, {
                type: c.includes('cabinet') ? 'cabinet' : 'counter'
            });

            return true;
        }

        if (/\b(delete|remove)\b/.test(c)) {
            deleteSelected();
            return true;
        }

        if (/\brotate\b/.test(c) && selected) {
            checkpoint();

            selected.object.rotation =
                ((Number(selected.object.rotation) || 0) + 90) % 360;

            redraw();

            return true;
        }

        return false;
    }

    async function runAI(prompt) {
        if (!prompt || !prompt.trim()) return;
        appendAIMessage('user', prompt);
        const responseElement = appendAIMessage('assistant', 'Checking the AI connection…');
        setStatus('Checking AI backend…');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        try {
            const response = await fetch(AI_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    prompt,
                    drawing: serialiseDrawing(),
                    task: 'architectural_drawing_assistant',
                    projectName: activeProjectName
                })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = result.error || result.message || `Backend returned HTTP ${response.status}.`;
                throw new Error(message);
            }
            const reply = result.reply || result.message || result.response || '';
            if (result.drawing || result.project) {
                checkpoint();
                restoreDrawing(result.drawing || result.project);
            } else if (result.commands && Array.isArray(result.commands)) {
                checkpoint();
                for (const command of result.commands) runCommand(String(command));
            } else if (result.command) {
                if (!runCommand(String(result.command))) throw new Error('The AI returned a command this app does not understand.');
            }
            responseElement.textContent = reply || (result.drawing || result.project || result.command || result.commands ? 'Done. Review the generated drawing and dimensions.' : 'The AI replied but did not return drawing changes.');
            setStatus('AI response received.');
        } catch (error) {
            // First attempt deterministic offline actions; never pretend the AI worked.
            const isActionRequest = /^(\s*(please\s+)?(draw|create|make|build|generate|design|add|place|delete|remove|rotate|mirror|trim|undo|redo|save|print|export|select|new|clear|grid|snap|wall\b|door\b|window\b|room\b|column\b|socket\b|light\b|switch\b|fan\b|bed\b|sofa\b|chair\b|table\b|toilet\b|sink\b))/i.test(prompt);
            const locallyHandled = isActionRequest && runCommand(prompt);
            if (locallyHandled) {
                responseElement.textContent = `Offline mode: I used the built-in drawing tools for this request. The AI model was not reached. (${error.name === 'AbortError' ? 'Connection timed out' : error.message})`;
                setStatus('Offline drawing command completed; AI unavailable.');
            } else {
                const detail = error.name === 'AbortError' ? 'The AI server took longer than 45 seconds to respond.' : error.message;
                responseElement.textContent = `AI is NOT connected. No AI-generated result was created. ${detail} Start the Node backend from the project folder and configure OPENAI_API_KEY in backend/.env. Basic drawing tools still work; complete natural-language AI generation requires the backend and a valid API key.`;
                setStatus('AI unavailable — backend/key needs attention.');
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    function ensureAIInterface() {
        if ($('aiAssistantPanel')) return;

        const panel = document.createElement('section');

        panel.id = 'aiAssistantPanel';

        panel.style.cssText = `
            position:fixed;
            right:18px;
            bottom:75px;
            z-index:500;
            width:min(390px,calc(100vw - 36px));
            height:min(520px,70vh);
            display:none;
            flex-direction:column;
            background:#202020;
            color:#f5f5f5;
            border:1px solid #555;
            border-radius:10px;
            box-shadow:0 8px 30px #0009;
            overflow:hidden;
        `;

        panel.innerHTML = `
            <header style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:12px;
                border-bottom:1px solid #444
            ">
                <strong>AI Drawing Assistant</strong>
                <button id="closeAI">×</button>
            </header>

            <div id="aiMessages"
                 style="flex:1;overflow:auto;padding:12px">
            </div>

            <form id="aiForm"
                  style="display:flex;gap:6px;padding:10px;border-top:1px solid #444">
                <textarea id="aiPrompt"
                          rows="2"
                          placeholder="Ask a question or describe a drawing…"
                          style="flex:1;min-width:0;resize:vertical"></textarea>
                <button type="submit">Send</button>
            </form>
        `;

        document.body.appendChild(panel);

        $('closeAI').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        $('aiForm').addEventListener('submit', event => {
            event.preventDefault();

            const prompt = $('aiPrompt').value.trim();

            if (!prompt) return;

            $('aiPrompt').value = '';

            runAI(prompt);
        });

        ensureColourControls();
    }

    function appendAIMessage(role, message) {
        const container = $('aiMessages');

        const bubble = document.createElement('div');

        bubble.style.cssText = `
            margin:8px 0;
            padding:10px;
            border-radius:8px;
            white-space:pre-wrap;
            overflow-wrap:anywhere;
            background:${role === 'user' ? '#303c52' : '#303030'};
        `;

        bubble.textContent = message;

        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;

        return bubble;
    }

    function startVoiceInput() {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                'Voice recognition is unavailable in this browser. ' +
                'Try a recent version of Chrome.'
            );

            return;
        }

        if (listening && recognition) {
            recognition.stop();
            return;
        }

        recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            listening = true;
            $('voiceButton').textContent = 'Listening…';
            setStatus('Listening for your command.');
        };

        recognition.onend = () => {
            listening = false;

            if ($('voiceButton')) {
                $('voiceButton').textContent = '🎙 Voice';
            }
        };

        recognition.onerror = event => {
            setStatus(`Voice input error: ${event.error}`);
        };

        recognition.onresult = event => {
            const spoken =
                event.results[0][0].transcript.trim();

            if (el.commandInput) {
                el.commandInput.value = spoken;
            }

            if (!runCommand(spoken)) {
                runAI(spoken);
            }
        };

        recognition.start();
    }

    /* ========================================================
       BASIC 3D VIEWER
       ======================================================== */

    function open3DView() {
        if (threeView) {
            threeView.style.display = 'flex';
            draw3DPreview();
            return;
        }

        threeView = document.createElement('div');

        threeView.id = 'threeDViewer';

        threeView.style.cssText = `
            position:fixed;
            inset:0;
            z-index:20000;
            display:flex;
            flex-direction:column;
            background:#151515;
            color:#fff;
        `;

        threeView.innerHTML = `
            <header style="
                display:flex;
                align-items:center;
                gap:10px;
                padding:12px;
                background:#222
            ">
                <strong style="flex:1">3D Building Preview</strong>

                <label>
                    Rotate
                    <input id="view3DRotation"
                           type="number"
                           value="25"
                           min="0"
                           max="360"
                           style="width:70px">
                    °
                </label>

                <button id="view3DRefresh">Refresh</button>
                <button id="view3DWalk">Walk mode</button>
                <button id="view3DClose">Close</button>
            </header>

            <div style="padding:8px 12px;color:#bbb;font-size:12px">
                Drag to rotate the preview. Use the wheel to zoom.
                Walk mode supports WASD or arrow keys.
            </div>

            <canvas id="threeDCanvas"
                    style="width:100%;height:100%;flex:1;touch-action:none">
            </canvas>
        `;

        document.body.appendChild(threeView);

        $('view3DClose').addEventListener('click', () => {
            threeView.style.display = 'none';
        });

        $('view3DRefresh').addEventListener('click', draw3DPreview);

        $('view3DRotation').addEventListener('input', draw3DPreview);

        $('view3DWalk').addEventListener('click', () => {
            alert(
                'Walk mode uses WASD or the arrow keys to move the viewpoint. ' +
                'This is a basic preview, not a full architectural simulation.'
            );
        });

        const viewCanvas = $('threeDCanvas');

        let rotation = 25;
        let viewZoom = 1;
        let dragging = false;
        let lastX = 0;

        viewCanvas.addEventListener('pointerdown', event => {
            dragging = true;
            lastX = event.clientX;
            viewCanvas.setPointerCapture(event.pointerId);
        });

        viewCanvas.addEventListener('pointermove', event => {
            if (!dragging) return;

            rotation += event.clientX - lastX;
            lastX = event.clientX;

            $('view3DRotation').value =
                ((rotation % 360) + 360) % 360;

            draw3DPreview();
        });

        viewCanvas.addEventListener('pointerup', () => {
            dragging = false;
        });

        viewCanvas.addEventListener('wheel', event => {
            event.preventDefault();

            viewZoom = clamp(
                viewZoom * (event.deltaY < 0 ? 1.1 : 0.9),
                0.3,
                3
            );

            draw3DPreview();
        }, { passive: false });

        viewCanvas.dataset.viewZoom = String(viewZoom);

        draw3DPreview();
    }

    function draw3DPreview() {
        if (!threeView || threeView.style.display === 'none') return;

        const viewCanvas = $('threeDCanvas');

        if (!viewCanvas) return;

        const rect = viewCanvas.getBoundingClientRect();

        const ratio = Math.max(1, window.devicePixelRatio || 1);

        viewCanvas.width = Math.max(1, Math.round(rect.width * ratio));
        viewCanvas.height = Math.max(1, Math.round(rect.height * ratio));

        const view = viewCanvas.getContext('2d');

        view.setTransform(ratio, 0, 0, ratio, 0, 0);

        const width = rect.width;
        const height = rect.height;

        view.fillStyle = '#181818';
        view.fillRect(0, 0, width, height);

        const angle =
            (Number($('view3DRotation')?.value || 25) * Math.PI) / 180;

        const viewZoom = Number(viewCanvas.dataset.viewZoom || 1);

        const objects = [];

        for (const wall of drawing.walls) {
            objects.push({
                type: 'wall',
                points: [
                    { x: wall.x1, y: wall.y1 },
                    { x: wall.x2, y: wall.y2 }
                ],
                color: wall.color || '#c7c7c7'
            });
        }

        for (const room of drawing.rooms) {
            objects.push({
                type: 'room',
                points: [
                    { x: room.x, y: room.y },
                    { x: room.x + room.width, y: room.y },
                    { x: room.x + room.width, y: room.y + room.height },
                    { x: room.x, y: room.y + room.height }
                ],
                color: room.color || '#577b6c'
            });
        }

        if (!objects.length) {
            view.fillStyle = '#ccc';
            view.font = '16px Arial';
            view.textAlign = 'center';

            view.fillText(
                'Draw walls or rooms to preview your plan.',
                width / 2,
                height / 2
            );

            return;
        }

        const allPoints = objects.flatMap(object => object.points);

        const minX = Math.min(...allPoints.map(p => p.x));
        const maxX = Math.max(...allPoints.map(p => p.x));

        const minY = Math.min(...allPoints.map(p => p.y));
        const maxY = Math.max(...allPoints.map(p => p.y));

        const centreX = (minX + maxX) / 2;
        const centreY = (minY + maxY) / 2;

        const span = Math.max(maxX - minX, maxY - minY, 100);

        const scale = Math.min(width, height) * 0.65 / span * viewZoom;

        function project(point, z = 0) {
            const x = point.x - centreX;
            const y = point.y - centreY;

            const rx = x * Math.cos(angle) - y * Math.sin(angle);
            const ry = x * Math.sin(angle) + y * Math.cos(angle);

            return {
                x: width / 2 + rx * scale,
                y: height / 2 + ry * scale * 0.55 - z * scale * 0.5
            };
        }

        // Draw room floor polygons.
        for (const room of drawing.rooms) {
            const points = [
                { x: room.x, y: room.y },
                { x: room.x + room.width, y: room.y },
                { x: room.x + room.width, y: room.y + room.height },
                { x: room.x, y: room.y + room.height }
            ].map(p => project(p));

            view.beginPath();

            points.forEach((p, index) => {
                if (index === 0) view.moveTo(p.x, p.y);
                else view.lineTo(p.x, p.y);
            });

            view.closePath();

            view.fillStyle = room.color || '#475c53';
            view.globalAlpha = 0.45;
            view.fill();
            view.globalAlpha = 1;

            view.strokeStyle = '#a4b7ad';
            view.stroke();
        }

        // Draw walls as simple extruded polygons.
        for (const wall of drawing.walls) {
            const a = { x: wall.x1, y: wall.y1 };
            const b = { x: wall.x2, y: wall.y2 };

            const thickness = toPixels(wall.thickness || 200);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length = Math.hypot(dx, dy) || 1;

            const nx = -dy / length * thickness / 2;
            const ny = dx / length * thickness / 2;

            const base = [
                { x: a.x + nx, y: a.y + ny },
                { x: b.x + nx, y: b.y + ny },
                { x: b.x - nx, y: b.y - ny },
                { x: a.x - nx, y: a.y - ny }
            ];

            const top = base.map(p => ({
                x: p.x,
                y: p.y
            }));

            const baseProjected = base.map(p => project(p, 0));
            const topProjected = top.map(p => project(p, 150));

            view.beginPath();

            [...baseProjected, ...topProjected.slice().reverse()]
                .forEach((p, index) => {
                    if (index === 0) view.moveTo(p.x, p.y);
                    else view.lineTo(p.x, p.y);
                });

            view.closePath();

            view.fillStyle = wall.color || '#c7c7c7';
            view.globalAlpha = 0.75;
            view.fill();
            view.globalAlpha = 1;

            view.strokeStyle = '#eee';
            view.stroke();

            for (let i = 0; i < 4; i++) {
                const j = (i + 1) % 4;

                view.beginPath();
                view.moveTo(baseProjected[i].x, baseProjected[i].y);
                view.lineTo(topProjected[i].x, topProjected[i].y);
                view.lineTo(topProjected[j].x, topProjected[j].y);
                view.lineTo(baseProjected[j].x, baseProjected[j].y);
                view.closePath();

                view.fillStyle = wall.color || '#c7c7c7';
                view.globalAlpha = 0.55;
                view.fill();
                view.globalAlpha = 1;

                view.strokeStyle = '#ddd';
                view.stroke();
            }
        }

        // Furniture is drawn as identifiable plan symbols on the isometric
        // floor (beds with pillows, sofas with seats, tables with chairs, etc.)
        // instead of anonymous labelled-looking blocks.
        for (const type of ['furniture', 'kitchen', 'bathroom', 'columns', 'electrical']) {
            for (const object of drawing[type]) {
                const kind = normalise(object.type || type);
                const w = Math.max(4, toPixels(object.width || object.size || 600));
                const h = Math.max(4, toPixels(object.depth || object.size || 600));
                const rotation = (Number(object.rotation) || 0) * Math.PI / 180;
                const local = (x,y) => ({
                    x: object.x + x*Math.cos(rotation) - y*Math.sin(rotation),
                    y: object.y + x*Math.sin(rotation) + y*Math.cos(rotation)
                });
                const polygon = (points, fill=true) => {
                    const projected = points.map(([x,y]) => project(local(x,y), 32));
                    view.beginPath(); projected.forEach((p,i)=>i?view.lineTo(p.x,p.y):view.moveTo(p.x,p.y));
                    view.closePath(); if(fill){view.fillStyle=object.color||'#c2b8a5';view.globalAlpha=.72;view.fill();view.globalAlpha=1;}
                    view.strokeStyle=object.color||'#eee'; view.lineWidth=1.25; view.stroke(); return projected;
                };
                const line = (points) => { const ps=points.map(([x,y])=>project(local(x,y),34)); view.beginPath(); ps.forEach((p,i)=>i?view.lineTo(p.x,p.y):view.moveTo(p.x,p.y)); view.strokeStyle='#f1f1f1'; view.lineWidth=1; view.stroke(); };
                polygon([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]);
                if (/bed|mattress/.test(kind)) {
                    line([[-w*.46,-h*.26],[w*.46,-h*.26]]);
                    polygon([[-w*.38,-h*.44],[-w*.08,-h*.44],[-w*.08,-h*.29],[-w*.38,-h*.29]],false);
                    if(w>h*1.2) polygon([[w*.08,-h*.44],[w*.38,-h*.44],[w*.38,-h*.29],[w*.08,-h*.29]],false);
                } else if (/sofa|couch|loveseat|settee/.test(kind)) {
                    line([[-w*.38,-h*.35],[w*.38,-h*.35]]); line([[-w*.38,h*.35],[w*.38,h*.35]]);
                    line([[0,-h*.3],[0,h*.3]]);
                } else if (/table|desk|island|counter/.test(kind)) {
                    line([[-w*.38,-h*.3],[w*.38,-h*.3]]); line([[-w*.38,h*.3],[w*.38,h*.3]]);
                } else if (/chair|stool/.test(kind)) {
                    line([[-w*.35,-h*.25],[w*.35,-h*.25]]);
                } else if (/toilet/.test(kind)) {
                    polygon([[-w*.25,-h*.4],[w*.25,-h*.4],[w*.25,-h*.12],[w*.2,h*.25],[-w*.2,h*.25],[-w*.25,-h*.12]],false);
                    polygon([[-w*.18,-h*.4],[w*.18,-h*.4],[w*.18,-h*.12],[-w*.18,-h*.12]],false);
                } else if (/sink|basin/.test(kind)) {
                    polygon([[-w*.32,-h*.28],[w*.32,-h*.28],[w*.32,h*.28],[-w*.32,h*.28]],false);
                    const c=project(local(0,0),35); view.beginPath(); view.ellipse(c.x,c.y,Math.max(2,w*scale*.13),Math.max(2,h*scale*.13),0,0,Math.PI*2); view.stroke();
                } else if (/shower|bathtub/.test(kind)) {
                    polygon([[-w*.38,-h*.38],[w*.38,-h*.38],[w*.38,h*.38],[-w*.38,h*.38]],false);
                } else if (/light|socket|switch/.test(kind)) {
                    const c=project({x:object.x,y:object.y},36); view.beginPath(); view.arc(c.x,c.y,Math.max(2,Math.min(w,h)*scale*.18),0,Math.PI*2); view.strokeStyle=object.color||'#fff'; view.stroke();
                    if(kind==='light'){view.beginPath();view.moveTo(c.x-3,c.y);view.lineTo(c.x+3,c.y);view.moveTo(c.x,c.y-3);view.lineTo(c.x,c.y+3);view.stroke();}
                } else if (/car/.test(kind)) {
                    polygon([[-w*.28,-h*.4],[w*.28,-h*.4],[w*.4,-h*.2],[w*.4,h*.28],[w*.25,h*.42],[-w*.25,h*.42],[-w*.4,h*.28],[-w*.4,-h*.2]],false);
                    line([[-w*.24,-h*.15],[w*.24,-h*.15]]); line([[-w*.24,h*.18],[w*.24,h*.18]]);
                }
            }
        }
    }

    /* ========================================================
       CANVAS INTERACTION
       ======================================================== */

    canvas.addEventListener('pointerdown', event => {
        if (event.button === 1 || event.button === 2) {
            panState = {
                x: event.clientX,
                y: event.clientY,
                startX: pan.x,
                startY: pan.y
            };

            canvas.setPointerCapture(event.pointerId);

            return;
        }

        const point = snapPoint(getScreenPoint(event));

        pointer = point;

        if (activeTool === 'select') {
            const hit = hitTest(point);

            if (hit) {
                checkpoint();

                selectObject(hit);

                dragState = {
                    x: point.x,
                    y: point.y,
                    object: hit.object,
                    type: hit.type,
                    original: clone(hit.object)
                };
            } else {
                selected = null;
                refreshProperties();
                redraw();
            }

            return;
        }

        if (activeTool === 'wall') {
            if (!drawingStart) {
                drawingStart = point;
                setStatus('Click the wall endpoint.');
            } else {
                checkpoint();

                const wall = createWall(
                    drawingStart,
                    point,
                    200
                );

                if (wall) {
                    selected = { type: 'wall', object: wall };
                }

                drawingStart = null;

                refreshProperties();
                redraw();

                setStatus('Wall completed.');
            }

            return;
        }

        if (activeTool === 'door' || activeTool === 'window') {
            checkpoint();
            placeOpening(activeTool, point);
            return;
        }

        if (activeTool === 'room' || activeTool === 'kitchen') {
            if (!drawingStart) {
                drawingStart = point;
                setStatus(`Click the opposite corner of the ${activeTool}.`);
            } else {
                checkpoint();

                placeRoom(
                    drawingStart,
                    point,
                    activeTool === 'kitchen'
                );

                drawingStart = null;
            }

            return;
        }

        if (activeTool === 'dimension') {
            if (!drawingStart) {
                drawingStart = point;
                setStatus('Click the end of the dimension.');
            } else {
                checkpoint();

                const dimension = {
                    start: drawingStart,
                    end: point,
                    value: Math.round(
                        distance(drawingStart, point) * MM_PER_PIXEL
                    ),
                    text: '',
                    color: currentColor
                };

                drawing.dimensions.push(dimension);

                selected = { type: 'dimension', object: dimension };

                drawingStart = null;

                refreshProperties();
                redraw();

                setStatus('Dimension added.');
            }

            return;
        }

        if (activeTool === 'furniture') {
            checkpoint();

            placeBox('furniture', point, {
                type: el.furnitureType?.value || 'chair'
            });

            return;
        }

        if (activeTool === 'bathroom') {
            checkpoint();

            placeBox('bathroom', point, {
                type: el.bathroomType?.value || 'toilet'
            });

            return;
        }

        if (activeTool === 'kitchenFixture') {
            checkpoint();

            placeBox('kitchen', point, {
                type: el.kitchenType?.value || 'counter'
            });

            return;
        }

        if (activeTool === 'column') {
            checkpoint();
            placeColumn(point);
            return;
        }

        if (activeTool === 'electrical') {
            checkpoint();
            placeElectrical(point);
            return;
        }

        if (activeTool === 'mirror') {
            mirrorSelected('horizontal');
            return;
        }

        if (activeTool === 'trim') {
            trimDrawing();
        }
    });

    canvas.addEventListener('pointermove', event => {
        const point = getScreenPoint(event);

        pointer = point;

        if (panState) {
            pan.x = panState.startX +
                event.clientX - panState.x;

            pan.y = panState.startY +
                event.clientY - panState.y;

            redraw();

            return;
        }

        if (dragState && activeTool === 'select') {
            const dx = point.x - dragState.x;
            const dy = point.y - dragState.y;

            const object = dragState.object;

            if (dragState.type === 'wall') {
                object.x1 = dragState.original.x1 + dx;
                object.y1 = dragState.original.y1 + dy;
                object.x2 = dragState.original.x2 + dx;
                object.y2 = dragState.original.y2 + dy;
            } else if (dragState.type === 'dimension') {
                object.start = {
                    x: dragState.original.start.x + dx,
                    y: dragState.original.start.y + dy
                };

                object.end = {
                    x: dragState.original.end.x + dx,
                    y: dragState.original.end.y + dy
                };
            } else if (
                dragState.type === 'door' ||
                dragState.type === 'window'
            ) {
                // Move the opening along its wall.
                if (object.wall) {
                    const wall = object.wall;

                    const wx = wall.x2 - wall.x1;
                    const wy = wall.y2 - wall.y1;

                    const lenSq = wx * wx + wy * wy;

                    if (lenSq) {
                        object.t = clamp(
                            ((point.x - wall.x1) * wx +
                                (point.y - wall.y1) * wy) / lenSq,
                            0.02,
                            0.98
                        );
                    }
                }
            } else {
                object.x = dragState.original.x + dx;
                object.y = dragState.original.y + dy;
            }

            redraw();
        } else {
            redraw();
        }

        if (el.coords) {
            el.coords.textContent =
                `X: ${Math.round(toMM(point.x))} mm | ` +
                `Y: ${Math.round(toMM(point.y))} mm`;
        }
    });

    canvas.addEventListener('pointerup', () => {
        panState = null;

        if (dragState) {
            dragState = null;

            refreshProperties();
            redraw();
        }
    });

    canvas.addEventListener('pointercancel', () => {
        panState = null;
        dragState = null;
    });

    canvas.addEventListener('contextmenu', event => {
        event.preventDefault();
    });

    canvas.addEventListener('wheel', event => {
        event.preventDefault();

        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const oldZoom = zoom;

        zoom = clamp(
            zoom * (event.deltaY < 0 ? 1.1 : 0.9),
            0.2,
            5
        );

        pan.x = mouseX -
            (mouseX - pan.x) * (zoom / oldZoom);

        pan.y = mouseY -
            (mouseY - pan.y) * (zoom / oldZoom);

        redraw();
    }, { passive: false });

    /* ========================================================
       TOOLBAR AND BUTTONS
       ======================================================== */

    function addButton(id, text, handler) {
        let button = $(id);
        const normalText = value => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
        const aliases = {
            Undo: ['undo', 'undobutton', 'tdgundo'], Redo: ['redo', 'redobutton', 'tdgredo'], Print: ['print', 'printdrawing', 'printbutton'],
            'My Drawings': ['mydrawings', 'files', 'open', 'tdgfiles'],
            'Export SVG': ['exportsvg'], Mirror: ['mirror', 'mirrorbutton', 'tdgmirror'], Trim: ['trim', 'trimbutton', 'tdgtrim'],
            Grid: ['grid', 'togglegrid', 'gridbutton', 'tdggrid'], Snap: ['snap', 'togglesnap', 'snapbutton', 'tdgsnap'],
            Import: ['import', 'importdrawing', 'importdrawingjson', 'tdgimport'],
            Export: ['export', 'exportdrawing', 'tdgexport'],
            Save: ['save', 'savedrawing', 'savebutton'], Load: ['load', 'loaddrawing', 'loadbutton'],
            New: ['new', 'newdrawing', 'newbutton']
        }[text] || [normalText(text)];

        // Reuse the original toolbar control when it already exists, even if
        // its ID differs. This avoids the duplicate Undo/Redo row problem.
        if (!button) {
            const candidates = document.querySelectorAll('button, [role="button"]');
            button = Array.from(candidates).find(candidate => {
                const identity = [candidate.textContent, candidate.title,
                    candidate.getAttribute('aria-label'), candidate.dataset.action,
                    candidate.dataset.command, candidate.id].map(normalText);
                return identity.some(value => aliases.includes(value)) &&
                    !candidate.dataset.tdgHandlerBound;
            }) || null;
        }

        if (!button) {
            button = document.createElement('button');
            button.id = id;
            button.type = 'button';
            button.textContent = text;
            const toolbar = $('topbar') || $('topToolbar') || $('toolbar') || $('toolPanel') || document.body;
            toolbar.appendChild(button);
        } else if (!button.id) {
            button.id = id;
        }

        // Prevent duplicate listeners if initialise/installButtons runs again.
        if (button.dataset.tdgHandlerBound !== 'true') {
            button.addEventListener('click', handler);
            button.dataset.tdgHandlerBound = 'true';
        }
        return button;
    }

    function installButtons() {
        const topbar = $('topbar');
        const commandBar = $('commandBar');

        // All non-command action buttons live in the same top toolbar.
        // Undo/Redo used to appear in the side tool list as well. Keep one
        // canonical control for each action in the top toolbar.
        $('undoButton')?.remove();
        $('redoButton')?.remove();

        const topActions = [
            ['tdgUndo', '↶ Undo', undo, 'Undo (Ctrl+Z)'],
            ['tdgRedo', '↷ Redo', redo, 'Redo (Ctrl+Y)'],
            ['tdgPrint', 'Print', printDrawing, 'Print drawing'],
            ['tdgFiles', 'My Drawings', showFileManager, 'Manage saved drawings'],
            ['tdgExportSVG', 'Export SVG', exportSVG, 'Export drawing as SVG'],
            ['tdgMirror', 'Mirror', () => mirrorSelected('horizontal'), 'Mirror selected object'],
            ['tdgTrim', 'Trim', trimDrawing, 'Trim intersecting walls'],
            ['tdgGrid', 'Grid', () => { gridVisible = !gridVisible; redraw(); }, 'Toggle grid'],
            ['tdgSnap', 'Snap', () => { snapGrid = !snapGrid; setStatus(`Snapping ${snapGrid ? 'on' : 'off'}.`); }, 'Toggle snapping'],
            ['tdgImport', 'Import', importJSONFile, 'Import a JSON drawing'],
            ['tdg3DView', '3D View', open3DView, 'Open 3D preview']
        ];

        topActions.forEach(([id, label, handler, title]) => {
            let button = $(id);
            if (!button) {
                button = document.createElement('button');
                button.id = id;
                button.type = 'button';
                button.className = 'topButton actionButton';
                button.textContent = label;
                topbar.appendChild(button);
            } else if (button.parentElement !== topbar) {
                topbar.appendChild(button);
            }
            button.classList.add('topButton', 'actionButton');
            button.title = title;
            button.setAttribute('aria-label', title);
            if (button.dataset.tdgHandlerBound !== 'true') {
                button.addEventListener('click', handler);
                button.dataset.tdgHandlerBound = 'true';
            }
        });

        // Command controls use compact icons with accessible names/tooltips.
        if (commandBar) {
            let aiButton = $('aiOpenButton');
            if (!aiButton) {
                aiButton = document.createElement('button');
                aiButton.id = 'aiOpenButton';
                aiButton.type = 'button';
                aiButton.textContent = '✨';
                aiButton.title = 'AI assistant';
                aiButton.setAttribute('aria-label', 'AI assistant');
                commandBar.appendChild(aiButton);
            }
            let voiceButton = $('voiceButton');
            if (!voiceButton) {
                voiceButton = document.createElement('button');
                voiceButton.id = 'voiceButton';
                voiceButton.type = 'button';
                voiceButton.textContent = '🎙️';
                voiceButton.title = 'Voice recognition';
                voiceButton.setAttribute('aria-label', 'Voice recognition');
                commandBar.appendChild(voiceButton);
            }
            if (!voiceButton.dataset.tdgHandlerBound) {
                voiceButton.addEventListener('click', startVoiceInput);
                voiceButton.dataset.tdgHandlerBound = 'true';
            }
            let runButton = $('tdgRunCommand');
            if (!runButton) {
                runButton = document.createElement('button');
                runButton.id = 'tdgRunCommand';
                runButton.type = 'button';
                runButton.textContent = '▶';
                runButton.title = 'Run command';
                runButton.setAttribute('aria-label', 'Run command');
                commandBar.appendChild(runButton);
            }
            if (!runButton.dataset.tdgHandlerBound) {
                runButton.addEventListener('click', () => {
                    const command = el.commandInput?.value.trim();
                    if (!command) return;
                    if (isLikelyNaturalLanguageRequest(command)) runAI(command);
                    else if (!runCommand(command)) runAI(command);
                    if (el.commandInput) el.commandInput.value = '';
                });
                runButton.dataset.tdgHandlerBound = 'true';
            }
            if (!aiButton.dataset.tdgHandlerBound) {
                aiButton.addEventListener('click', () => {
                    const panel = $('aiAssistantPanel');
                    if (!panel) return;
                    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
                    $('aiPrompt')?.focus();
                });
                aiButton.dataset.tdgHandlerBound = 'true';
            }
        }

        const tools = document.querySelectorAll('.tool[data-tool]');

        tools.forEach(button => {
            const tool = button.dataset.tool;
            // Undo/Redo already have dedicated handlers above; don't attach a
            // second click listener to the same toolbar controls.
            if ((tool === 'undo' || tool === 'redo') && button.dataset.tdgHandlerBound === 'true') return;
            if (button.dataset.tdgToolHandlerBound === 'true') return;
            button.addEventListener('click', () => {
                if (tool === 'undo') return undo();
                if (tool === 'redo') return redo();
                setTool(tool);
            });
            button.dataset.tdgToolHandlerBound = 'true';
        });

        if ($('newDrawing') && !$('newDrawing').dataset.tdgHandlerBound) {
            $('newDrawing').addEventListener('click', () => {
                if (!confirm('Start a new drawing?')) return;

                checkpoint();

                drawing = emptyDrawing();
                selected = null;
                zoom = 1;
                pan = { x: 0, y: 0 };

                refreshProperties();
                redraw();

                setStatus('New drawing ready.');
            });
            $('newDrawing').dataset.tdgHandlerBound = 'true';
        }

        if ($('saveDrawing') && !$('saveDrawing').dataset.tdgHandlerBound) {
            $('saveDrawing').addEventListener('click', () => saveProject());
            $('saveDrawing').dataset.tdgHandlerBound = 'true';
        }

        if ($('loadDrawing') && !$('loadDrawing').dataset.tdgHandlerBound) {
            $('loadDrawing').addEventListener('click', showFileManager);
            $('loadDrawing').dataset.tdgHandlerBound = 'true';
        }

        // Import is a separate action from Load: Load opens saved projects,
        // while Import reads an external JSON drawing file.
        const importButton = $('importDrawing') || $('importDrawingJSON') || $('tdgImport');
        if (importButton && !importButton.dataset.tdgHandlerBound) {
            importButton.addEventListener('click', importJSONFile);
            importButton.dataset.tdgHandlerBound = 'true';
        }

        if ($('exportDrawing') && !$('exportDrawing').dataset.tdgHandlerBound) {
            $('exportDrawing').addEventListener('click', () => {
                exportPNG();
                exportJSON();
            });
            $('exportDrawing').dataset.tdgHandlerBound = 'true';
        }

        if (el.commandInput) {
            el.commandInput.addEventListener('keydown', event => {
                if (event.key !== 'Enter') return;

                event.preventDefault();

                const command = el.commandInput.value.trim();

                if (!command) return;

                if (isLikelyNaturalLanguageRequest(command)) {
                    runAI(command);
                } else if (!runCommand(command)) {
                    runAI(command);
                }

                el.commandInput.value = '';
            });
        }

        applyPropertyPanels();
        installShortcuts();
    }

    function installShortcuts() {
        document.addEventListener('keydown', event => {
            const target = event.target;

            if (
                target &&
                /INPUT|SELECT|TEXTAREA/.test(target.tagName) &&
                !event.ctrlKey &&
                !event.metaKey
            ) {
                return;
            }

            if ((event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undo();
            } else if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'y'
            ) {
                event.preventDefault();
                redo();
            } else if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's'
            ) {
                event.preventDefault();
                saveProject();
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                deleteSelected();
            } else if (
                event.key.toLowerCase() === 'r' &&
                selected
            ) {
                checkpoint();

                selected.object.rotation =
                    ((Number(selected.object.rotation) || 0) + 90) % 360;

                redraw();
            } else if (event.key === 'Escape') {
                drawingStart = null;
                pointer = null;
                dragState = null;

                redraw();
            }
        });
    }

    /* ========================================================
       STARTUP
       ======================================================== */

    function initialise() {
        ensureAIInterface();
        ensureColourControls();

        installButtons();

        const lastProject = localStorage.getItem(CURRENT_KEY);
        const projects = getProjects();

        if (lastProject && projects[lastProject]?.drawing) {
            try {
                restoreDrawing(projects[lastProject].drawing);
                activeProjectName = lastProject;
            } catch (error) {
                console.warn('Could not restore the last drawing:', error);
            }
        }

        canvas.style.touchAction = 'none';

        if (el.coords) {
            el.coords.textContent = 'X: 0 mm | Y: 0 mm';
        }

        setToolStatus();

        window.addEventListener('resize', resizeCanvas);

        resizeCanvas();

        setStatus('Technical Drawing Generator ready.');
    }

    window.TechnicalDrawingApp = {
        getDrawing: serialiseDrawing,
        loadDrawing: restoreDrawing,
        redraw,
        undo,
        redo,
        runCommand,
        runAI,
        saveProject,
        showFileManager,
        exportJSON,
        importJSONFile,
        exportPNG,
        exportSVG,
        printDrawing,
        mirrorSelected,
        trimDrawing,
        open3DView,
        getState: () => ({
            activeTool,
            zoom,
            gridVisible,
            snapGrid,
            snapWalls,
            selected
        })
    };

    
    initialise();

})();