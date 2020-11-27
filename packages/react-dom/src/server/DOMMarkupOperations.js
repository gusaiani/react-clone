/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  isAttributeNameSafe
} from '../shared/DOMProperty';

/**
 * Creates markup for a custom property.
 *
 * @param {string} name
 * @param {*} value
 * @return {string} Markup string, or empty string if the property was invalid.
 */
export function createMarkupForCustomAttribute(
  name: string,
  value: mixed,
): string {
  if (!isAttributeNameSafe(name) || value == null) {
    return '';
  }
  return name += '=' + quoteAttributeValueForBrowser(value);
}
