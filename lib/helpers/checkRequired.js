'use strict';

function checkRequired(options, requireOptionKeys) {
  for (let i = 0; i < requireOptionKeys.length; i += 1) {
    const key = requireOptionKeys[i];
    if (options[key] === undefined) {
      throw new TypeError(`"${key}" is required`);
    }
  }
}


module.exports = checkRequired;
