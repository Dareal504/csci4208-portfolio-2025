// examples/whiteboard/public/js/controller/WhiteboardDemoController.js
import {
  WebTouchController,
  VirtualKeyboardModule,
  DrawingpadModule // Used to be WhiteboardModule
} from 'webtouch-sdk';

export class WhiteboardDemoController extends WebTouchController {
  buildUI(container, client, store) {
    // 1. Simple toolbar for file upload
    const toolbar = document.createElement('div');
    toolbar.className = 'controller-toolbar';
    toolbar.innerHTML = `
      <label class="controller-upload-button">
        📎 Add File to Board
        <input type="file" class="controller-file-input" multiple accept="image/*,application/pdf" hidden />
      </label>
    `;
    container.appendChild(toolbar);

    const fileInput = toolbar.querySelector('.controller-file-input');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            // Send to app as a custom event
            // Assumes the client exposes sendCustomEvent(name, payload)
            client.sendCustomEvent('board:addFileFromController', {
              mimeType: file.type,
              fileName: file.name,
              dataUrl
            });
          };
          reader.readAsDataURL(file);
        }
        e.target.value = '';
      });
    }

    // 2. Drawing Pad
    new DrawingpadModule({
      controllerClient: client,
      parent: container,
      store: store
    });

    // 3. Keyboard (at the bottom)
    new VirtualKeyboardModule({
      controllerClient: client,
      parent: container
    });
  }
}
