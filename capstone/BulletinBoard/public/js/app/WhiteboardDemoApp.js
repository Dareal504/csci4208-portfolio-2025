// examples/whiteboard/public/js/app/WhiteboardDemoApp.js
//
// WhiteboardDemoApp
// -----------------
// Kiosk/public-side app for the multi-user whiteboard example.
// Extends WebTouchApp from webtouch-sdk using "Multi-User Mode".

import { WebTouchApp } from 'webtouch-sdk';
import { resizeCanvasToDisplaySize, redrawAll } from './drawingUtils.js';

export class WhiteboardDemoApp extends WebTouchApp {
  constructor(config) {
    super({ ...config, multiUser: true });
    this._nextItemId = 1;
  }

  onInit(appCtx) {
    const appRoot = appCtx.appRoot;
    if (!appRoot) throw new Error('WhiteboardDemoApp: appRoot not found');

    // UI: toolbar + canvas
    appRoot.innerHTML = `
      <div class="whiteboard-shell">
        <div class="whiteboard-toolbar">
          <label class="wb-upload-button">
            📎 Add File
            <input type="file" id="wb-file-input" multiple accept="image/*,application/pdf" hidden />
          </label>
        </div>
        <div class="whiteboard-canvas-wrapper">
          <canvas id="whiteboardCanvas"></canvas>
        </div>
      </div>
    `;

    const canvas = document.getElementById('whiteboardCanvas');
    const ctx = canvas.getContext('2d');
    const fileInput = document.getElementById('wb-file-input');

    this._canvas = canvas;
    this._ctx = ctx;

    // Board state
    this.state = {
      viewportX: 0,
      viewportY: 0,
      strokes: [],
      activeStrokes: new Map(),
      texts: [],
      items: [],          // photos / pdf cards
      selectedItemId: null
    };

    // Render loop
    const render = () => redrawAll(ctx, canvas, this.state, this._cursors);
    const handleResize = () =>
      resizeCanvasToDisplaySize(canvas, ctx, this.state, render);

    window.addEventListener('resize', handleResize);
    handleResize();

    this._render = render;

    // Cursor movement → pan or drag item
    this.client.onCursorMove((payload, id) => {
      const user = this._cursors.get(id);
      if (!user || !user.data || !user.data.isDragging) return;

      const SENSITIVITY = 2.0;
      const dx = (payload.deltaX || 0) * SENSITIVITY;
      const dy = (payload.deltaY || 0) * SENSITIVITY;

      if (user.data.tool === 'pan') {
        // If dragging an item, make item follow cursor
        if (user.data.draggingItemId) {
          const item = this.state.items.find(
            (i) => i.id === user.data.draggingItemId
          );
          if (item) {
            const worldX = user.x - this.state.viewportX;
            const worldY = user.y - this.state.viewportY;
            const offsetX = user.data.dragOffsetX || 0;
            const offsetY = user.data.dragOffsetY || 0;

            item.x = worldX - offsetX;
            item.y = worldY - offsetY;
            this._render();
          }
        } else {
          // Otherwise pan the whole board
          this.state.viewportX += dx;
          this.state.viewportY += dy;
          this._render();
        }
      }
    });

    // Kiosk file upload
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        this._handleFiles(files);
        e.target.value = '';
      });
    }

    // Click: select item or open it in new tab
    canvas.addEventListener('click', (event) => this._handleCanvasClick(event));
  }

  // ---------------------------------------------------------------------------
  // WebTouch Hooks
  // ---------------------------------------------------------------------------

  onPlayerUpdate(cursorMap, changedId) {
    const user = cursorMap.get(changedId);

    if (!user) {
      this._render();
      return;
    }

    // Initialize new user
    if (!user.data.tool) {
      this.updateCursorData(changedId, {
        tool: 'pen',
        color: '#000000',
        size: 4,
        isDragging: false,
        draggingItemId: null,
        dragOffsetX: 0,
        dragOffsetY: 0
      });
    }

    // Add stroke points while drawing
    if (user.data.isDragging && user.data.currentStrokeId) {
      const stroke = this.state.activeStrokes.get(user.data.currentStrokeId);
      if (stroke) {
        const worldX = user.x - this.state.viewportX;
        const worldY = user.y - this.state.viewportY;
        stroke.points.push({ x: worldX, y: worldY });
      }
    }

    this._render();
  }

  onCustomEvent(name, payload, id) {
    // Tool updates
    if (name === 'draw:mode') {
      this.updateCursorData(id, {
        tool: payload.mode,
        isDragging: false,
        draggingItemId: null,
        dragOffsetX: 0,
        dragOffsetY: 0
      });
      const user = this._cursors.get(id);
      if (user && user.data && user.data.activeText) this._commitText(user);
    }
    if (name === 'draw:color') this.updateCursorData(id, { color: payload.color });
    if (name === 'draw:size') this.updateCursorData(id, { size: payload.lineWidth });

    // Stroke / drag start
    if (name === 'draw:strokeStart') {
      const user = this._cursors.get(id);
      if (!user) return;

      // Pan tool: either grab an item or pan background
      if (user.data.tool === 'pan') {
        const worldX = user.x - this.state.viewportX;
        const worldY = user.y - this.state.viewportY;
        const hit = this._hitTestItem(worldX, worldY);

        if (hit) {
          // Start dragging this item: remember offset from cursor to top-left
          const offsetX = worldX - hit.x;
          const offsetY = worldY - hit.y;

          this._setSelectedItem(hit.id);
          this.updateCursorData(id, {
            isDragging: true,
            draggingItemId: hit.id,
            dragOffsetX: offsetX,
            dragOffsetY: offsetY
          });
        } else {
          // Start panning the board
          this._setSelectedItem(null);
          this.updateCursorData(id, {
            isDragging: true,
            draggingItemId: null,
            dragOffsetX: 0,
            dragOffsetY: 0
          });
        }
      } else {
        // Other tools: draw or type
        this._setSelectedItem(null);
        this.updateCursorData(id, {
          isDragging: true,
          draggingItemId: null,
          dragOffsetX: 0,
          dragOffsetY: 0
        });

        if (user.data.tool === 'type') {
          this._startTyping(user);
        } else if (user.data.tool !== 'pan') {
          this._startStroke(user, payload.id);
        }
      }
    }

    // Stroke / drag end
    if (name === 'draw:strokeEnd') {
      this.updateCursorData(id, {
        isDragging: false,
        draggingItemId: null,
        dragOffsetX: 0,
        dragOffsetY: 0
      });
      this._endStroke(payload.id);
    }

    // Clear / undo
    if (name === 'draw:clear') {
      this.state.strokes = [];
      this.state.texts = [];
      this.state.items = [];
      this.state.activeStrokes.clear();
      this._setSelectedItem(null);
    }
    if (name === 'draw:undo') {
      if (this.state.strokes.length) this.state.strokes.pop();
      else if (this.state.texts.length) this.state.texts.pop();
    }

    // Files sent from controller
    if (name === 'board:addFileFromController') {
      const user = this._cursors.get(id);
      if (!user) {
        this._render();
        return;
      }

      const { mimeType, fileName, dataUrl } = payload || {};
      const worldX = user.x - this.state.viewportX;
      const worldY = user.y - this.state.viewportY;

      if (mimeType && mimeType.startsWith('image/')) {
        this._addImageFromDataUrl(dataUrl, fileName, worldX, worldY);
      } else if (mimeType === 'application/pdf') {
        this._addPdfFromDataUrl(dataUrl, fileName, worldX, worldY);
      }
    }

    this._render();
  }

  onKeyPress({ key }, id) {
    const user = this._cursors.get(id);
    if (!user || user.data.tool !== 'type') return;

    if (!user.data.activeText) {
      if (key.length === 1) this._startTyping(user);
      else return;
    }

    const textObj = user.data.activeText;

    if (key === 'Backspace') {
      textObj.content = textObj.content.slice(0, -1);
    } else if (key === 'Enter') {
      this._commitText(user);
    } else if (key.length === 1) {
      textObj.content += key;
    }
    this._render();
  }

  // ---------------------------------------------------------------------------
  // Drawing / text helpers
  // ---------------------------------------------------------------------------

  _startStroke(user, strokeId) {
    const isEraser = user.data.tool === 'erase';

    const stroke = {
      id: strokeId,
      ownerId: user.id,
      mode: isEraser ? 'eraser' : 'pen',
      color: isEraser ? '#ffffff' : user.data.color,
      lineWidth: isEraser ? user.data.size * 4 : user.data.size,
      points: [
        {
          x: user.x - this.state.viewportX,
          y: user.y - this.state.viewportY
        }
      ]
    };

    this.state.activeStrokes.set(strokeId, stroke);
    this.updateCursorData(user.id, { currentStrokeId: strokeId });
  }

  _endStroke(strokeId) {
    const stroke = this.state.activeStrokes.get(strokeId);
    if (stroke) {
      this.state.strokes.push(stroke);
      this.state.activeStrokes.delete(strokeId);
    }
  }

  _startTyping(user) {
    if (user.data.activeText) this._commitText(user);

    const newText = {
      x: user.x - this.state.viewportX,
      y: user.y - this.state.viewportY,
      color: user.data.color,
      fontSize: 20,
      content: ''
    };

    this.updateCursorData(user.id, { activeText: newText });
  }

  _commitText(user) {
    const text = user.data.activeText;
    if (text && text.content.trim()) {
      this.state.texts.push(text);
    }
    this.updateCursorData(user.id, { activeText: null });
  }

  // ---------------------------------------------------------------------------
  // Bulletin board helpers (files)
  // ---------------------------------------------------------------------------

  _handleFiles(files) {
    if (!files || !files.length || !this._canvas) return;

    const rect = this._canvas.getBoundingClientRect();
    const centerScreenX = rect.width / 2;
    const centerScreenY = rect.height / 2;

    const worldCenterX = centerScreenX - this.state.viewportX;
    const worldCenterY = centerScreenY - this.state.viewportY;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        this._addImageFile(file, worldCenterX, worldCenterY);
      } else if (file.type === 'application/pdf') {
        this._addPdfFile(file, worldCenterX, worldCenterY);
      }
    }
  }

  _addImageFile(file, worldCenterX, worldCenterY) {
    const url = URL.createObjectURL(file);
    this._addImageFromDataUrl(url, file.name, worldCenterX, worldCenterY);
  }

  _addPdfFile(file, worldCenterX, worldCenterY) {
    const url = URL.createObjectURL(file);
    this._addPdfFromDataUrl(url, file.name, worldCenterX, worldCenterY);
  }

  _addImageFromDataUrl(dataUrl, fileName, worldCenterX, worldCenterY) {
    if (!this._canvas) return;
    const img = new Image();

    img.onload = () => {
      const rect = this._canvas.getBoundingClientRect();
      const maxWidth = rect.width * 0.35;
      const maxHeight = rect.height * 0.35;

      let width = img.width;
      let height = img.height;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      width *= scale;
      height *= scale;

      const item = {
        id: this._nextItemId++,
        type: 'image',
        x: worldCenterX - width / 2,
        y: worldCenterY - height / 2,
        width,
        height,
        image: img,
        fileName: fileName || 'image',
        url: dataUrl,
        isSelected: false
      };

      this.state.items.push(item);
      this._setSelectedItem(item.id);
      this._render();
    };

    img.src = dataUrl;
  }

  _addPdfFromDataUrl(dataUrl, fileName, worldCenterX, worldCenterY) {
    const width = 200;
    const height = 260;

    const item = {
      id: this._nextItemId++,
      type: 'pdf',
      x: worldCenterX - width / 2,
      y: worldCenterY - height / 2,
      width,
      height,
      fileName: fileName || 'Document.pdf',
      url: dataUrl,
      isSelected: false
    };

    this.state.items.push(item);
    this._setSelectedItem(item.id);
    this._render();
  }

  _handleCanvasClick(event) {
    if (!this._canvas) return;

    const rect = this._canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const worldX = screenX - this.state.viewportX;
    const worldY = screenY - this.state.viewportY;

    const hit = this._hitTestItem(worldX, worldY);

    if (!hit) {
      this._setSelectedItem(null);
      this._render();
      return;
    }

    // Select the item
    this._setSelectedItem(hit.id);

    // Open full file in a new tab on click
    if (hit.url) {
      window.open(hit.url, '_blank', 'noopener,noreferrer');
    }

    this._render();
  }

  _hitTestItem(worldX, worldY) {
    // Topmost first
    for (let i = this.state.items.length - 1; i >= 0; i--) {
      const item = this.state.items[i];
      if (
        worldX >= item.x &&
        worldX <= item.x + item.width &&
        worldY >= item.y &&
        worldY <= item.y + item.height
      ) {
        return item;
      }
    }
    return null;
  }

  _setSelectedItem(itemId) {
    this.state.selectedItemId = itemId;
    for (const item of this.state.items) {
      item.isSelected = item.id === itemId;
    }
  }
}
