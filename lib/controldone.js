/**
 * Created by melvynkim on 02/10/16.
 */

'use strict';

const Controller = require('./controller');
const ExpressTransport = require('./transports/express.transport');
const WampTransport = require('./transports/wamp.transport');
const SocketIoTransport = require('./transports/socket-io.transport');
const WsTransport = require('./transports/ws.transport');

class Controldone {
  constructor() {
    this.controllers = [];
  }

  addController(Controller, ...params) {
    const controller = new Controller(...params);
    this.controllers.push(controller);
    this.bind(controller);
    return this;
  }

  removeController(controller) {
    this.unbind(controller);
    this.controllers.splice(this.controllers.indexOf(controller), 1);
    return this;
  }

  bind(controller) {
    controller.bind();
    return this;
  }

  unbind(controller) {
    controller.unbind();
    return this;
  }
}

Controldone.Controller = Controller;
Controldone.ExpressTransport = ExpressTransport;
Controldone.WampTransport = WampTransport;
Controldone.SocketIoTransport = SocketIoTransport;
Controldone.WsTransport = WsTransport;

module.exports = Controldone;
