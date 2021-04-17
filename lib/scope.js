'use strict';

class Scope {
  constructor(action, transport) {
    this.action = action;
    this.owner = action;
    this.transport = transport;
    this.transportData = {};
  }

  get actionName() {
    return this.action.name;
  }

  checkActionName(...names) {
    return names.includes(this.action.name);
  }

  getTransportData() {
    return this.transportData;
  }

  get body() {
    return this.transport.getBody(this);
  }

  get params() {
    return this.transport.getParams(this);
  }

  get query() {
    return this.transport.getQuery(this);
  }
}

module.exports = Scope;
