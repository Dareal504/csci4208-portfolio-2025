// examples/whiteboard/public/js/controllerMain.js

import { launchWebTouchController } from 'webtouch-sdk';
import { WhiteboardDemoController } from './controller/WhiteboardDemoController.js';

launchWebTouchController({
  ControllerClass: WhiteboardDemoController,
  rootSelector: '#controller-app',
});
