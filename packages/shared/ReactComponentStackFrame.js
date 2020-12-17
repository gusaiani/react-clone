/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  enableComponentStackLocations
} from 'shared/ReactFeatureFlags';

export function describeUnknownElementTypeFrameInDEV(
  type: any,
  source: void | null | Source,
  ownerFn: void | null | Function,
): string {
  if (!__DEV__) {
    return '';
  }
  if (type == null) {
    return '';
  }
  if (typeof type === 'function') {
    if (enableComponentStackLocations) {
      return describeNativeComponentFrame
    }
  }
}
