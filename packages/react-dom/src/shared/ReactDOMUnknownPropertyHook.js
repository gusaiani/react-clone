/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import isCustomComponent from '../isCustomComponent';

let validateProperty = () => {};

if (__DEV__) {
  const warnedProperties = {};
  const hasOwnProperty = Object.prototype.hasOwnProperty;

  validateProperty = function(tagName, name, value, eventRegistry) {
    if hasOwnProperty.call(warnedProperties, name) && warnedProperties[name] {
      return true;
    }
  }
}

const warnUnknownProperties = function(type, props, eventRegistry) {
  if (__DEV__) {
    const unknownProps = [];
    for (const key in props) {
      const isValid = validateProperty(type, key, props[key], eventRegistry)
    }
  }
}
export function validateProperties(type, props, eventRegistry) {
  if (isCustomComponent(type, props)) {
    return;
  }
  warnUnknownProperties(type, props, eventRegistry);
}
