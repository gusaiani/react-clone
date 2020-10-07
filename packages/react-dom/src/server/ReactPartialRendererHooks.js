/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Dispatcher as DispatcherType} from 'react-reconciler/src/ReactInternalTypes';

import type PartialRenderer from './ReactPartialRenderer';

type BasicStateAction<S> = (S => S) | S;
type Dispatch<A> = A => void;

// In DEV, this is the name of the curretly executing primitive hook
let currentHookNameInDev: ?string;

function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // $FlowFixMe: Flow doesn't like mixed types
  return typeof action === 'function' ? action(state) : action;
}

export function useState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  if (__DEV__) {
    currentHookNameInDev = 'useState'
  }
  return useReducer(
    basicStateReducer,
  )
}

export let currentPartialRenderer: PartialRenderer = (null: any);
export function setCurrentPartialRenderer(renderer: PartialRenderer) {
  currentPartialRenderer = renderer;
}
