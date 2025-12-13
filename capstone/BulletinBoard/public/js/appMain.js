// examples/whiteboard/public/js/appMain.js

import { launchWebTouchApp } from 'webtouch-sdk';
import { WhiteboardDemoApp } from './app/WhiteboardDemoApp.js';

launchWebTouchApp({
  AppClass: WhiteboardDemoApp,
  selectors: {
    appRoot: '#app-root',
    cursor: '#cursor',
    qr: '#qrCodeContainer',
  },
});
