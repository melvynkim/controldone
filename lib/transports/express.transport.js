/**
 * Created by melvynkim on 10/09/16.
 */

'use strict';

class ExpressTransport {
  constructor(options) {
    this.transportName = 'express';
    this.app = options.app;
  }

  pre() {
  }

  post() {
  }

  getBody(scope) {
    return scope.transportData.req.body;
  }

  getParams(scope) {
    return scope.transportData.req.params;
  }

  getQuery(scope) {
    return scope.transportData.req.query;
  }

  /**
   * Returns handler for authentication.
   * @param action
   * @returns function to handle
   */
  // eslint-disable-next-line no-unused-vars
  getAuth(action) {
    return (req, res, callback) => {
      callback();
    };
  }

  addRoute(controller, method, paths, action, handlerFn) {
    paths.forEach((path) => {
      this.app[method](
        `${path}/${action.path}`,
        this.getAuth(action),
        (req, res) => {
          const scope = action.createScope(controller, this);

          scope.transportData.req = req;
          scope.transportData.res = res;

          handlerFn(scope);
        },
      );
    });
  }

  removeRoute(method, paths, action) {
    paths.forEach((path) => {
      for (let i = 0; i < this.app.routes[method].length; i += 1) {
        if (this.app.routes[method][i].path === `${path}/${action.path}`) {
          this.app.routes[method].splice(i, 1);
        }
      }
    });
  }

  setResData(data, scope, statusCode) {
    const { transportData } = scope;
    const { res } = transportData;

    if (typeof data !== 'undefined') {
      if (transportData.req.method.toLowerCase() !== 'head') {
        scope.controldoneResult = data;
        res.controldoneResult = data; // we need a way to get it from res
      }
    }

    res.statusCode = statusCode;
  }

  sendResult(result, scope) {
    result = result || scope.controldoneResult;
    scope.transportData.res.send(result);
  }
}

module.exports = ExpressTransport;
