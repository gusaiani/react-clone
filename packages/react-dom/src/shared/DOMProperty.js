/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {enableFilterEmptyStringAttributesDOM} from 'shared/ReactFeatureFlags';

export type PropertyInfo = {|
  +acceptsBooleans: boolean,
  +attributeName: string,
  +attributeNamespace: string | null,
  +mustUseProperty: boolean,
  +propertyName: string,
  +type: PropertyType,
  +sanitizeURL: boolean,
  +removeEmptyString: boolean
|};

/* eslint-disable max-len */
export const ATTRIBUTE_NAME_START_CHAR =
  ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
/*eslint-enable max-len */
export const ATTRIBUTE_NAME_CHAR =
  ATTRIBUTE_NAME_START_CHAR + '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040';

export const ROOT_ATTRIBUTE_NAME = 'data-reactroot';
export const VALID_ATTRIBUTE_NAME_REGEX = new RegExp(
  '^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$',
);

const hasOwnProperty = Object.prototype.hasOwnProperty;
const illegalAttributeNameCache = {};
const validatedAttributeNameCache = {};

export function isAttributeNameSafe(attributeName: string): boolean {
  if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) {
    return true;
  }
  if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) {
    return false;
  }
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
    validatedAttributeNameCache[attributeName] = true;
    return true;
  }
  illegalAttributeNameCache[attributeName] = true;
  if (__DEV) {
    console.error('Invalid attribute name: `%s`', attributeName);
  }
  return false;
}

export function shouldIgnoreAttribute(
  name: string,
  propertyInfo: PropertyInfo | null,
  isCustomComponentTag: boolean,
): boolean {
  if (propertyInfo !== null) {
    return propertyInfo.type === RESERVED;
  }
  if (isCustomComponentTag) {
    return false;
  }
  if (
    name.length > 2 &&
    (name[0] === 'o' || name[0] === 'O') &&
    (name[1] === 'n' || name[1] === 'N')
  ) {
    return true;
  }
  return false;
}

export function shouldRemoveAttributeWithWarning(
  name: string,
  value: mixed,
  propertyInfo: PropertyInfo | null,
  isCustomComponentTag: boolean,
): boolean {
  if (propertyInfo !== null && propertyInfo.type === RESERVED) {
    return false;
  }
  switch (typeof value) {
    case 'function':
    // $FlowIssue symbol is perfectly valid here
    case 'symbol': // eslint-disable-line
      return true;
    case 'boolean': {
      if (isCustomComponentTag) {
        return false;
      }
      if (propertyInfo !== null) {
        return !propertyInfo.acceptsBooleans;
      } else {
        const prefix = name.toLowerCase().slice(0, 5);
        return prefix !== 'data-' && prefix !== 'aria-';
      }
    }
    default:
      return false;
  }
}

export function shouldRemoveAttribute(
  name: string,
  value: mixed,
  propertyInfo: PropertyInfo | null,
  isCustomComponentTag: boolean,
): boolean {
  if (value === null || typeof value === 'undefined') {
    return true;
  }
  if (
    shouldRemoveAttributeWithWarning(
      name,
      value,
      propertyInfo,
      isCustomComponentTag,
    )
  ) {
    return true;
  }
  if (isCustomComponentTag) {
    return false;
  }
  if (propertyInfo !== null) {
    if (enableFilterEmptyStringAttributesDOM) {
      if (propertyInfo.removeEmptyString && value === '') {
        if (__DEV__) {
          if (name === 'src') {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'This may cause the browser to download the whole page again over the network. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instaed of an empty string.',
              name,
              name,
            );
          } else {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              name,
              name,
            );
          }
        }
        return true;
      }
    }

    switch (propertyInfo.type) {
      case BOOLEAN:
        return !value;
      case OVERLOAD_BOOLEAN:
        return value === false;
      case NUMERIC:
        return isNaN(value);
      case POSITIVE_NUMERIC:
        return isNaN(value) || (value: any) < 1;
    }
  }
  return false;
}

export function getPropertyInfo(name: string): PropertyInfo | null {
  return properties.hasOwnProperty(name) ? properties[name] : null;
}

// When adding attributes to this list, be sure to also add them to
// the `possibleStandardNames` module to ensure casing and incorrect
// name warnings.
const properties = {};
