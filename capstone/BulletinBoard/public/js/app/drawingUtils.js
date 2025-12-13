// examples/whiteboard/public/js/app/drawingUtils.js
//
// Canvas utilities for the whiteboard demo.
// These are WebTouch-agnostic: they only know about
// canvas, context, and the whiteboard state shape.

export const ITEM_HANDLE_SIZE = 16;  // bottom-right resize handle
export const ITEM_DELETE_SIZE = 18;  // top-right delete button size

/**
 * Resize the canvas to match its display size (HiDPI aware),
 * then call the provided redraw function.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} state
 * @param {Function} [redrawAllFn] - function()
 */
export function resizeCanvasToDisplaySize(canvas, ctx, state, redrawAllFn) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  if (typeof redrawAllFn === 'function') {
    redrawAllFn();
  }
}

/**
 * Main Rendering Loop.
 * Clears the canvas, applies the camera transform, and draws
 * all strokes, text, board items, and remote cursors.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {Object} state - The Board State (strokes, texts, viewport, items)
 * @param {Map} cursorMap - The SDK's Map of connected controllers
 */
export function redrawAll(ctx, canvas, state, cursorMap) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // 1. Reset Context to Screen Space to clear
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // 2. Apply Camera Transform (Move the World)
  ctx.translate(state.viewportX, state.viewportY);

  // 3. Draw World Content

  // A. Committed Strokes
  for (const stroke of state.strokes) {
    drawStrokePath(ctx, stroke);
  }

  // B. Active Strokes (Currently being drawn by users)
  for (const stroke of state.activeStrokes.values()) {
    drawStrokePath(ctx, stroke);
  }

  // C. Committed Text
  for (const text of state.texts) {
    drawTextObject(ctx, text, false);
  }

  // D. Board Items (images, PDFs)
  if (Array.isArray(state.items)) {
    for (const item of state.items) {
      drawBoardItem(ctx, item);
    }
  }

  // E. Active Text (Being edited by specific users)
  if (cursorMap) {
    cursorMap.forEach((user) => {
      if (user.data && user.data.activeText) {
        drawTextObject(ctx, user.data.activeText, true);
      }
    });
  }

  // 4. Draw Cursors (UI Overlay)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (cursorMap) {
    cursorMap.forEach((user) => {
      drawUserCursor(ctx, user);
    });
  }
}

/**
 * Draw a single stroke path.
 */
export function drawStrokePath(ctx, stroke) {
  if (!stroke || !stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = stroke.lineWidth;
  ctx.strokeStyle = stroke.color;

  // Eraser Logic
  if (stroke.mode === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.beginPath();
  
  const [first, ...rest] = stroke.points;
  ctx.moveTo(first.x, first.y);
  
  for (const p of rest) {
    ctx.lineTo(p.x, p.y);
  }
  
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a text object.
 * @param {boolean} isActive - If true, draws a dashed selection box.
 */
export function drawTextObject(ctx, textObj, isActive = false) {
  if (!textObj || typeof textObj.content !== 'string') return;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = textObj.color || '#000000';
  
  const fontSize = textObj.fontSize || 20;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = 'top';

  // Draw the text
  ctx.fillText(textObj.content + (isActive ? '|' : ''), textObj.x, textObj.y);

  // Draw selection box if editing
  if (isActive) {
    const metrics = ctx.measureText(textObj.content + '|');
    const width = metrics.width;
    const height = fontSize;

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(textObj.x - 4, textObj.y - 4, width + 8, height + 8);
  }

  ctx.restore();
}

/**
 * Draw a board item (image or PDF card) with optional selection UI.
 */
export function drawBoardItem(ctx, item) {
  if (!item) return;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  if (item.type === 'image' && item.image) {
    ctx.drawImage(item.image, item.x, item.y, item.width, item.height);
  } else if (item.type === 'pdf') {
    const x = item.x;
    const y = item.y;
    const w = item.width || 200;
    const h = item.height || 260;

    // Card background
    ctx.fillStyle = '#fdf2d0'; // light "paper" color
    ctx.strokeStyle = '#b08b5a'; // border
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    // PDF badge
    ctx.fillStyle = '#b00020';
    ctx.font = 'bold 20px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('PDF', x + 10, y + 10);

    // Filename
    ctx.fillStyle = '#333333';
    ctx.font = '12px sans-serif';
    const maxWidth = w - 20;
    const fileName = item.fileName || 'Document.pdf';
    const label = truncateTextToWidth(ctx, fileName, maxWidth);
    ctx.fillText(label, x + 10, y + 40);
  }

  // Selection overlay (border, resize handle, delete button)
  if (item.isSelected) {
    const x = item.x;
    const y = item.y;
    const w = item.width;
    const h = item.height;

    // Dashed outline
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.setLineDash([]);

    // Resize handle (bottom-right)
    const hs = ITEM_HANDLE_SIZE;
    const rx = x + w - hs;
    const ry = y + h - hs;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(rx, ry, hs, hs);
    ctx.fill();
    ctx.stroke();

    // Delete button (top-right)
    const ds = ITEM_DELETE_SIZE;
    const dx = x + w - ds;
    const dy = y;
    ctx.fillStyle = '#ff5252';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(dx, dy, ds, ds);
    ctx.fill();
    ctx.stroke();

    // "X"
    ctx.beginPath();
    ctx.moveTo(dx + 4, dy + 4);
    ctx.lineTo(dx + ds - 4, dy + ds - 4);
    ctx.moveTo(dx + ds - 4, dy + 4);
    ctx.lineTo(dx + 4, dy + ds - 4);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Truncate a text string so it fits within maxWidth (with ellipsis).
 */
function truncateTextToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(trimmed + '…').width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + '…';
}

/**
 * Draw the remote user's cursor.
 * @param {Object} user - The SDK User Object
 */
export function drawUserCursor(ctx, user) {
  if (typeof user.x !== 'number' || typeof user.y !== 'number') return;

  ctx.save();
  ctx.translate(user.x, user.y);

  // 1. The Cursor Ring
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  
  const color = (user.data && user.data.color) ? user.data.color : '#000000';
  
  ctx.fillStyle = color;
  ctx.fill();
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. The Tool Label (e.g. "PEN", "PAN")
  const toolName = (user.data && user.data.tool) ? user.data.tool.toUpperCase() : '';
  
  if (toolName) {
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(toolName, 0, 18);
  }

  ctx.restore();
}
