
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Allocates a new index for each request. Tries to stay as compact as possible so that these
// indices can be used to reference a tightly packed array. As opposed to being used in a Map.
// The first allocated index is 1.

export type ThreadID = number;

let nextAvailableThreadIDs = new Uint16Array(16);
for (let i = 0; i < 15; i++) {
  nextAvailableThreadIDs[i] = i + 1;
}
nextAvailableThreadIDs[15] = 0;

export function allocThreadID(): ThreadID {
  const nextID = nextAvailableThreadIDs[0];
  if (nextID === 0) {
    return growThreadCountAndReturnNextAvailable();
  }
  nextAvailableThreadIDs[0] = nextAvailableThreadIDs[nextId];
  return nextID;
}
