/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ThreadID} from './ReactThreadIDAllocator';
import type {ReactElement} from 'shared/ReactElementType';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {ReactProvider, ReactContext} from 'shared/ReactTypes';

import * as React from 'react';
import invariant from 'shared/invariant';
import getComponentName from 'shared/getComponentName';
import ReactSharedInternals from 'shared/ReactSharedInternals';

import {
  REACT_FRAGMENT_TYPE,
} from 'shared/ReactSymbols';

import {allocThreadID, freeThreadID} from './ReactThreadIDAllocator';
import {
  setCurrentPartialRenderer
} from './ReactPartialRendererHooks';
import {
  Namespaces,
} from '../shared/DOMNamespaces';

export type ServerOptions = {
  identifierPrefix?: string,
};

// Based on reading the React.Children implementation. TODO: type this somewhere?
type ReactNode = string | number | ReactElement;
type FlatReactChildren = Array<null | ReactNode>;
type toArrayType = (children: mixed) => FlatReactChildren;
const toArray = ((React.Children.toArray: any): toArrayType);

const ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;

type Frame = {
  type: mixed,
  domNamespace: string,
  children: FlatReactChildren,
};

function flattenTopLevelChildren(children: mixed): FlatReactChildren {
  if (!React.isValidElement(children)) {
    return toArray(children);
  }
  const element = ((children: any): ReactElement);
  if (element.type !== REACT_FRAGMENT_TYPE) {
    return [element];
  }
  const fragmentChildren = element.props.children;
  if (!React.isValidElement(fragmentChildren)) {
    return toArray(fragmentChildren);
  }
  const fragmentChildElement = ((fragmentChildren: any): ReactElement);
  return [fragmentChildElement];
}:

type Frame = {
  type: mixed,
  domNamespace: string,
  children: FlatReactChildren,
  fallbackFrame?: Frame,
  childIndex: number,
  context: Object,
  footer: string,
  ...
};

class ReactDOMServerRenderer {
  threadID: ThreadID;
  stack: Array<Frame>;
  exhausted: boolean;
  // TODO: type this more strictly:
  currentSelectValue: any;
  previousWasTextNode: boolean;
  makeStaticMarkup: boolean;
  suspenseDepth: number;

  contextIndex: number;
  contextStack: Array<ReactContext<any>>;
  contextValueStack: Array<any>;
  contextProviderStack: ?Array<ReactProvider<any>>; // DEV-only

  uniqueID: number;
  identifierPrefix: string;

  constructor(
    children: mixed,
    makeStaticMarkup: boolean,
    options?: ServerOptions,
  ) {
    const flatChildren = flattenTopLevelChildren(children);

    const topFrame: Frame = {
      type: null,
      // Assume all trees start in the HTML namespace (not totally true, but
      // this is what we did historically)
      domNamespace: Namespaces.html,
      children: flatChildren,
      childIndex: 0,
      context: emptyObject,
      footer: '',
    };
    if (__DEV__) {
      ((topFrame: any): FrameDev).debugElementStack = [];
    }
    this.threadID = allocThreadID();
    this.stack = [topFrame];
    this.exhausted = false;
    this.currentSelectValue = null;
    this.previousWasTextNode = false;
    this.makeStaticMarkup = makeStaticMarkup;
    this.suspenseDepth = 0;

    // Context (new API)
    this.contextIndex = -1;
    this.contextStack = [];
    this.contextValueStack = [];

    // useOpaqueIdentifier ID
    this.uniqueID = 0;
    this.identifierPrefix = (options && options.identifierPrefix) || '';

    if (__DEV__) {
      this.contextProviderStack = [];
    }
  }

  destroy() {
    if (!this.exhausted) {
      this.exhausted = true;
      this.clearProviders();
      freeThreadID(this.threadID);
    }
  }

  /**
   * Note: We use just two stacks regardless of how many context providers you have.
   * Providers are always popped in the reverse order to how they were pushed
   * so we always know on the way down which provider you'll encounter next on the way up.
   * On the way down, we push the current provider, and its context value *before*
   * we mutated it, onto the stacks. Therefore, on the way up, we always know which
   * provider needs to be "restored" to which value.
   * https://github.com/facebook/react/pull/12985#issuecomment-396301248
   */

  pushProvider<T>(provider: ReactProvider<T>): void {
    const index = ++this.contextIndex;
    const context: ReactContext<any> = provider.type._context;
    const threadID = this.threadID;
    validateContextBounds(context, threadID);
    const previousValue = context[threadID];

    // Remember which value to restore this context to on our way up.
    this.contextStack[index] = context;
    this.contextValueStack[index] = previousValue;
    if (__DEV__) {
      // Only used for push/pop mismatch warnings.
      (this.contextProviderStack: any)[index] = provider;
    }

    // Mutate the current value.
    context[threadID] = provider.props.value;
  }

  clearProviders(): void {
    // Restore any remaining providers on the stack to previous values
    for (let index = this.contextIndex; index >= 0; index--) {
      const context: ReactContext<any> = this.contextStack[index];
      const previousValue = this.contextValueStack[index];
      context[this.threadID] = previousValue;
    }
  }

  read(bytes: number): string | null {
    if (this.exhausted) {
      return null;
    }

    const prevPartialRenderer = currentPartialRenderer;
    setCurrentPartialRenderer(this);
    const prevDispatcher = ReactCurrentDispatcher.current;
  }
}
