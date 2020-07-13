/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
export type ReactEmpty = null | void | boolean;
export type ReactNodeList = ReactEmpty | React$Node;

export type RefObject = {|
  value: any,
|};

