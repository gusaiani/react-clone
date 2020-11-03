/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ATTRIBUTE_NAME_CHAR} from './DOMProperty';
import isCustomComponent from './isCustomComponent';

const warnedProperties = {};
const rARIA = new RegExp('^(aria)-[' + ATTRIBUTE_NAME_CHAR + ']*$');

function validateProperty(tagName, name) {
  if (__DEV__) {
    if (hasOwnProperty.call(warnedProperties, name) && warnedProperties[name]) {
      return true;
    }
  }
}

function warnInvalidARIAProps(type, props) {
  if (__DEV__) {
    const invalidProps = [];

    for (const key in props) {
      const isValid = validateProperty(type, key);
    }
  }
}

export function validateProperties(type, props) {
  if (isCustomComponent(type, props)) {
    return;
  }
  warnInvalidARIAProps(type, props);
}
