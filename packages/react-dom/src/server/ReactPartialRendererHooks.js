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

let currentlyRenderingComponent: Object | null = null;
let firstWorkInProgressHook: Hook | null = null;
let workInProgressHook: Hook | null = null;
// Whether the work-in-progress hook is a re-rendered hook
let isReRende: boolean = false;
// Whether an update was scheduled during the currently executing render pass.
let didScheduleRenderPhaseUpdate: boolean = false;
// Lazily created map of render-phase updates
let renderPhaseUpdates: Map<UpdateQueue<any>, Update<any>> | null = null;
// Conter to prevent infinite loops.
let numberOfReRenders: number = 0;
const RE_RENDER_LIMIT = 25;

let isInHookUserCodeInDev = false;

// In DEV, this is the name of the curretly executing primitive hook
let currentHookNameInDev: ?string;

export function prepareToUseHooks(componentIdentity: Object): void {
  currentlyRenderingComponent = componentIdentity;
  if (__DEV__) {
    isInHookUserCodeInDev = false;
  }

  // The following should have already been reset
  // didScheduleRenderPhaseUpdate = false;
  // firstWorkInProgressHook = null;
  // numberOfReRenders = 0;
  // renderPhaseUpdates = null;
  // workInProgressHook = null;
}

export function finishHooks(
  Component: any,
  props: any,
  children: any,
  refOrContext: any,
): any {
  // This must be called after every function component to prevent hooks from
  // being used in classes.

  while (didScheduleRenderPhaseUpdate) {
    // Updates were scheduled during the render phase. They are stored in
    // the `renderPhaseUpdates` map. Call the component again, reusing the
    // work-in-progress hooks and applying the additional updates on top. Keep
    // restarting until no more updates are scheduled.
    didScheduleRenderPhaseUpdate = false;
    numberOfReRenders += 1;

    // Start over from the beginning of the list
    workInProgressHook = null;

    children = Component(props, refOrContext);
  }
  resetHooksState();
  return children;
}

// Reset the internal hooks state if an error occurs while rendering a component
export function resetHooksState(): void {
  if (__DEV__) {
    isInHookUserCodeInDev = false;
  }

  currentlyRenderingComponent = null;
  didScheduleRenderPhaseUpdate = false;
  firstWorkInProgressHook = null;
}

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
