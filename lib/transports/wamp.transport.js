/**
 * Created by melvynkim on 10/09/16.
 */

'use strict';

class WampTransport {
  constructor(options) {
    this.transportName = 'wamp';
    this.routes = {};
    this.session = options.session;
    this.prefix = options.prefix || 'controldone';
  }

  addRoute(controller, method, paths, action, handlerFn) {
    const currentRoute = `${this.prefix}.${method}.${paths[0]}`;
    this.routes[currentRoute] = this.session.register(currentRoute, (payload) => {
      const scope = action.createScope(controller, this);

      scope.transportData.payload = payload;
      scope.transportData.result = {};

      handlerFn(scope)
        .then(() => scope.transportData.result);
    });
  }

  removeRoute(method, paths) {
    this.session.unregister(this.routes[`${this.prefix}.${method}.${paths[0]}`]);
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
    scope.transportData.result.data = result;
    scope.transportData.result.statusCode = scope.statusCode;
  }
}

module.exports = WampTransport;
