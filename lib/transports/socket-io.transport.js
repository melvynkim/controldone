/**
 * Created by melvynkim on 10/09/16.
 */

'use strict';

const handlers = {};
let subscribed = false;

class SocketIoTransport {
  constructor(options) {
    this.transportName = 'socket.io';
    this.sio = options.sio;
    this.prefix = options.prefix || 'controldone';

    if (!subscribed) {
      this.sio.on('connection', (socket) => {
        socket.on(this.prefix, (payload) => {
          try {
            this.handle(socket, payload);
          } catch (err) {
            socket.emit('error', err);
          }
        });
      });
      subscribed = true;
    }
  }

  addRoute(controller, method, paths, action, handlerFn) {
    handlers[`${method}:${paths[0]}${action.path.length > 0 ? '/' : ''}${action.path}`] = (socket, payload) => {
      const scope = action.createScope(controller, this);

      payload.params = payload.params || {};

      scope.transportData.socket = socket;
      scope.transportData.payload = payload;
      scope.transportData.result = {};

      handlerFn(scope)
        .then(() => {
          socket.emit(this.prefix, { method, path: paths[0], result: scope.transportData.result });
        });
    };
  }

  removeRoute(method, paths, action) {
    delete handlers[`${method}:${paths[0]}${action.path.length > 0 ? '/' : ''}${action.path}`];
  }

  pre() {
  }

  post() {
  }


  getBody(scope) {
    return scope.transportData.payload.body;
  }

  getParams(scope) {
    return scope.transportData.payload.params;
  }

  getQuery(scope) {
    return scope.transportData.payload.query;
  }

  setResData(data, scope, statusCode) {
    if (typeof data !== 'undefined') {
      scope.controldoneResult = data;
    }
    scope.statusCode = statusCode;
  }

  sendResult(result, scope) {
    result = result || scope.controldoneResult;
    scope.transportData.result.body = result;
    scope.transportData.result.statusCode = scope.statusCode;
  }

  handle(socket, payload) {
    const handler = handlers[payload.route];
    if (!handler) {
      throw new Error(`Unhandled route: ${payload.route}`);
    }

    handler(socket, payload);
  }
}

module.exports = SocketIoTransport;
