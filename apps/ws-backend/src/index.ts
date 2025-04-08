import { WebSocketServer } from 'ws';
import { setupListener } from './setuplisteners';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  setupListener(ws)
});