# WebTouch Example – Multi-User Whiteboard

This example shows how to build a **multi-user whiteboard** using the [`webtouch-sdk`](https://www.npmjs.com/package/webtouch-sdk):

- A **public whiteboard app** runs on a TV or browser.
- One or more **controllers** (phones/tablets) connect via room code / QR.
- Controllers use:
  - a **touchpad** to move the cursor,
  - **drawing tools** (mode/color/size/pen toggle),
  - a **virtual keyboard** for typing text onto the board.

This example is meant as a reference for building your own WebTouch-powered apps.

## 0. Architecture
```text
whiteboard/
    package.json
    README.md
    server.js              # Node/Express + attachWebTouchHub

    public/
      app.html             # kiosk/public view
      controller.html      # controller view

      css/
        webtouch.css       # shared SDK-ish styles (cursor, QR, basic layout)
        webtouchController.css
        whiteboard.css     # app-specific styling (optional)

      js/
        app/
          WhiteboardDemoApp.js      # extends WebTouchApp, canvas/drawing logic
          drawingUtils.js           # optional: helpers for strokes, camera, etc.

        controller/
          WhiteboardDemoController.js # extends WebTouchController, composes modules

        appMain.js                  # calls launchWebTouchApp(...)
        controllerMain.js           # calls launchWebTouchController(...)
```

---

## 1. Prerequisites

- Node.js 18+ recommended
- A browser for the kiosk app
- A phone/tablet browser for the controller (same LAN / reachable server)

---

## 2. Running the Example

From the repo root:

```bash
cd webtouch-sdk/examples/whiteboard
npm install
npm start
````

Then:

* Open the **kiosk/public app** in a browser:

  * `http://localhost:3000/`

* Open the **controller app** (phone or another browser):

  * Scan the QR code shown on the kiosk **or**
  * Visit `http://localhost:3000/controller` and enter the room code manually.

---

## 3. How It’s Wired

This example uses all three pillars of the WebTouch SDK:

### Server (Node)

`server.js`:

* Creates an Express + Socket.IO server.
* Serves `public/app.html` and `public/controller.html`.
* Attaches the WebTouch hub:

```js
import { attachWebTouchHub } from 'webtouch-sdk';

// ...
attachWebTouchHub(io, { debug: true });
```

### Kiosk / Public App

`public/js/WhiteboardDemoApp.js`:

* Extends `WebTouchApp` from the SDK.
* Draws on a `<canvas>` based on:

  * cursor movement,
  * drawing tools events (`draw:mode`, `draw:color`, `draw:size`, `draw:strokeStart`, `draw:strokeEnd`),
  * keypress events from the virtual keyboard (for TYPE mode).

`public/js/appMain.js`:

```js
import { launchWebTouchApp } from 'webtouch-sdk';
import { WhiteboardDemoApp } from './WhiteboardDemoApp.js';

launchWebTouchApp({
  AppClass: WhiteboardDemoApp,
  selectors: {
    appRoot: '#app-root',
    cursor: '#cursor',
    qr: '#qrCodeContainer',
  },
});
```

### Controller App

`public/js/WhiteboardDemoController.js`:

* Extends `WebTouchController` from the SDK.
* Composes built-in controller modules:

```js
import {
  WebTouchController,
  TouchpadModule,
  VirtualKeyboardModule,
  DrawingToolsModule,
} from 'webtouch-sdk';

export class WhiteboardDemoController extends WebTouchController {
  buildUI(container, client, store) {
    new TouchpadModule({ controllerClient: client, parent: container });
    new DrawingToolsModule({ controllerClient: client, parent: container, store });
    new VirtualKeyboardModule({ controllerClient: client, parent: container });
  }
}
```

`public/js/controllerMain.js`:

```js
import { launchWebTouchController } from 'webtouch-sdk';
import { WhiteboardDemoController } from './WhiteboardDemoController.js';

launchWebTouchController({
  ControllerClass: WhiteboardDemoController,
  rootSelector: '#controller-app',
});
```

---

## 4. Event Flow Summary

Controller modules send high-level events via the WebTouch SDK:

* `TouchpadModule` → `sendCursorMove`, `sendTap`
* `DrawingToolsModule` → `draw:mode`, `draw:color`, `draw:size`, `draw:undo`, `draw:clear`, `draw:strokeStart`, `draw:strokeEnd`
* `VirtualKeyboardModule` → `sendKeyPress({ key })`

The hub relays these as `controller_event`s to the kiosk app, and `WhiteboardDemoApp` handles them in `onCustomEvent` / `onKeyPress` to update the canvas.

---

## 5. Adapting This Example

To create your own app:

1. Keep the server + HTML structure.
2. Write your own `MyApp` class extending `WebTouchApp`.
3. Write your own `MyController` class extending `WebTouchController`.
4. Compose controller modules (`TouchpadModule`, `DrawingToolsModule`, `VirtualKeyboardModule`) as needed.
5. Define your own custom events (e.g. `game:action`, `slider:update`) and handle them in the app.

You can treat this whiteboard as a “kitchen sink” reference for how all the pieces fit together.


