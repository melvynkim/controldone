'use strict';

const path = require('path');
const _ = require('lodash');
const HTTP_STATUSES = require('http-status-node');

const ControldoneScope = require('./scope');
const checkRequired = require('./helpers/checkRequired');

const ERROR_TYPE = 'controldone';
const DEFAULT_ACTION = {
  enabled: true,
  method: 'get',
  priority: 1,
};

class Controller {
  constructor(options) {
    const requiredFields = ['path', 'transports', 'actions'];
    checkRequired(options, requiredFields);
    this.log = options.log;
    this.path = options.path;
    this.transports = options.transports;

    const { default: defaultAction = {} } = options.actions;
    this.defaultAction = _.merge(
      {},
      DEFAULT_ACTION,
      defaultAction,
    );
    this.actions = {};
    Object.entries(options.actions)
      .forEach(
        ([actionKey, action]) => {
          if (actionKey !== 'default') {
            this.addAction(action, actionKey);
          }
        },
      );
    if (options.plugins) {
      options.plugins.forEach((pluginData) => {
        pluginData.plugin(this, pluginData.options);
      });
    }
  }

  createScope(controller, transport) {
    return new ControldoneScope(this, transport, this.contextFactory);
  }

  bind() {
    if (typeof this.path === 'string') {
      this.path = [this.path];
    }
    _.sortBy(this.actions, 'priority').forEach((action) => {
      try {
        if (action.enabled) {
          if (typeof action.method === 'string') {
            action.method = [action.method];
          }
          action.method.forEach((method) => {
            action.transports.forEach(transport =>
              transport.addRoute(this, method, this.path, action, async (scope) => {
                try {
                  const data = await action.handler(scope);
                  action.setResData(data, scope);
                } catch (err) {
                  action.setResError(err, scope);
                }
                action.sendResult(scope);
              }),
            );
          });
        }
      } catch (err) {
        if (this.log) {
          this.log.error(
            `Cannot set route for action: ${action.name} and path ${this.path}/${action.path}`);
          this.log.error('Error', err);
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `Cannot set route for action: ${action.name} and path ${this.path}/${action.path}`);
          // eslint-disable-next-line no-console
          console.error('Error', err);
        }

        throw err;
      }
    });
  }

  unbind() {
    if (typeof this.path === 'string') {
      this.path = [this.path];
    }
    _.sortBy(this.actions, 'priority').forEach((action) => {
      try {
        if (action.enabled) {
          if (typeof action.method === 'string') {
            action.method = [action.method];
          }
          action.method.forEach((method) => {
            action.transports.forEach(transport =>
              transport.removeRoute(method, this.path, action));
          });
        }
      } catch (err) {
        if (this.log) {
          this.log.error(
            `Cannot unset route for action: ${action.name} and path ${this.path}/${action.path}`);
          this.log.error('Error', err);
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `Cannot unset route for action: ${action.name} and path ${this.path}/${action.path}`);
          // eslint-disable-next-line no-console
          console.error('Error', err);
        }

        throw err;
      }
    });
  }

  setResData(data, scope, statusCode) {
    if (!statusCode) {
      if (typeof data !== 'undefined') {
        statusCode = (scope.newContent ? HTTP_STATUSES.CREATED.code : HTTP_STATUSES.OK.code);
      } else {
        statusCode = HTTP_STATUSES.NO_CONTENT.code;
      }
    }
    scope.transport.setResData(data, scope, statusCode);
  }

  setResError(
    err, scope, log = this.log,
    controllerParseError = this.parseError,
  ) {
    const {
      type = ERROR_TYPE,
      httpStatus = false,
      error,
      message = httpStatus.message,
      details,
    } = err;
    // eslint-disable-next-line no-console
    const logError = log ? log.error.bind(log) : console.error.bind(console);

    if (!err) {
      err = HTTP_STATUSES.INTERNAL_SERVER_ERROR.createError();
    } else if (!(err instanceof Error)) {
      err = new Error(err.message, err.details);
    }

    const result = {
      type,
      status: httpStatus.code,
      error,
      message,
      details,
    };

    if (!httpStatus) {
      const parseResult = (controllerParseError && controllerParseError(err));

      if (parseResult) {
        Object.assign(result, parseResult);
        if (result.status.code) {
          result.status = result.status.code;
        }
      } else {
        Object.assign(result, { status: HTTP_STATUSES.INTERNAL_SERVER_ERROR.code });
      }
    }

    scope.transport.setResData(result, scope, result.status);
    logError('Error(%d): %s: %s',
      result.status,
      result.message,
      JSON.stringify(result.details, null, 2),
    );

    // extract stack data
    const data = {};

    try {
      const stacklist = err.stack.split('\n').slice(3);
      // Stack trace format :
      // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
      const s = stacklist[0];
      const sp = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi
        .exec(s)
        || /at\s+()(.*):(\d*):(\d*)/gi.exec(s);
      if (sp && sp.length === 5) {
        [, data.method, data.path, data.line, data.pos] = sp;
        data.file = path.basename(data.path);
        data.stack = stacklist.join('\n');
      } else {
        data.raw = err.stack;
      }
    } catch (err) {
      logError('Error in error handler!');
      data.raw = err.stack;
    }

    logError(data);
  }

  sendResult(scope) {
    scope.transport.sendResult(scope.controldoneResult, scope);
  }

  addAction(actionOptions, actionKey) {
    if (typeof (actionOptions) !== 'object') {
      // interpret it as bool
      actionOptions = {
        enabled: !!actionOptions,
      };
    }
    const readyActionOptions = { ...this.defaultAction, ...actionOptions };
    if (readyActionOptions.path === undefined) {
      readyActionOptions.path = readyActionOptions.path || actionKey;
    }
    readyActionOptions.name = actionKey;

    const action = Object.create(this);
    Object.assign(action, this, readyActionOptions);

    if (!_.isFunction(action.handler)) {
      action.handler = action[action.handler || actionKey];
    }
    if (!_.isFunction(action.handler)) {
      throw new Error(`Wrong handler for ${actionKey}`);
    }
    this.actions[actionKey] = action;
    return action;
  }
}

module.exports = Controller;
