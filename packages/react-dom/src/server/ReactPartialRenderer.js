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
  enableSuspenseServerRenderer,
  enableFundamentalAPI,
  enableScopeAPI,
} from 'shared/ReactFeatureFlags';

import {
  REACT_FRAGMENT_TYPE,
} from 'shared/ReactSymbols';

import {
  validateContextBounds
} from './ReactPartialRendererContext';
import {allocThreadID, freeThreadID} from './ReactThreadIDAllocator';
import escapeTextForBrowser from './escapeTextForBrowser';
import {
  prepareToUseHooks,
  finishHooks,
  resetHooksState,
  Dispatcher,
  setCurrentPartialRenderer,
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

// This is only used in DEV.
// Each entry is `this.stack` from a currently executing renderer instance.
// (There may be more than one because ReactDOMServer is reentrant).
// Each stack is an array of frames which may contain nested stacks of elements.
const currentDebugStacks = [];

const ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
let ReactDebugCurrentFrame;
let prevGetCurrentStackImpl = null;
let getCurrentServerStackImpl = () => '';
let describeStackFrame = element => '';

let popCurrentDebugStack = () => {};

if (__DEV__) {
  ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

  popCurrentDebugStack = function() {
    currentDebugStacks.pop();

    if (currentDebugStacks.length === 0) {
      // We are exiting the server renderer.
      // Restore the previous (e.g. client) global stack implementation.
      ReactDebugCurrentFrame.getCurrentStack = prevGetCurrentStackImpl;
      prevGetCurrentStackImpl = null;
    }
  };
}

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
    ReactCurrentDispatcher.current = Dispatcher;
    try {
      // Markup generated within <Suspense> ends up buffered until we know
      // nothing in that boundary suspended
      const out = [''];
      let suspended = false;
      while (out[0].length < bytes) {
        if (this.stack.length === 0) {
          this.exhausted = true;
          freeThreadID(this.threadID);
          break;
        }
        const frame: Frame = this.stack[this.stack.length - 1];
        if (suspended || frame.childIndex >= frame.children.length) {
          const footer = frame.footer;
          if (footer !== '') {
            this.previousWasTextNode = false;
          }
          this.stack.pop();
          if (frame.type === 'select') {
            this.currentSelectValue = null;
          } else if (
            frame.type != null &&
            frame.type.type != null &&
            frame.type.type.$$typeof === REACT_PROVIDER_TYPE
          ) {
            const provider: ReactProvider<any> = (frame.type: any);
            this.popProvider(provider);
          } else if (frame.type === REACT_SUSPENSE_TYPE) {
            this.suspenseDepth--;
            const buffered = out.pop();

            if (suspended) {
              suspended = false;
              // If rendering was suspended at this boundary, render the fallbackFrame
              const fallbackFrame = frame.fallbackFrame;
              invariant(
                fallbackFrame,
                'ReactDOMServer did not find an internal fallback frame for Suspense. ' +
                  'This is a bug in React. Please file an issue.',
              );
              this.stack.push(fallbackFrame);
              out[this.suspenseDepth] += '<!--$!-->';
              // Skip flushing output since we're switching to the fallback
              continue;
            } else {
              out[this.suspenseDepth] += buffered;
            }
          }

          // Flush output
          out[this.suspenseDepth] += footer;
          continue;
        }
        const child = frame.children[frame.childIndex++];

        let outBuffer = '';
        if (__DEV__) {
          pushCurrentDebugStack(this.stack);
          // We're starting work on this frame, so reset its inner stack.
          ((frame: any): FrameDev).debugElementStack.length = 0;
        }
        try {
          outBuffer += this.render(child, frame.context, frame.domNamespace);
        } catch (err) {
          if (err != null && typeof err.then === 'function') {
            if (enableSuspenseServerRenderer) {
              invariant(
                this.suspenseDepth > 0,
                // TODO: include component name. This is a bit tricky with current factoring.
                'A React component suspended while rendering, but no fallback UI was specified.\n' +
                  '\n' +
                  'Add a <Suspense fallback=...> component higher in the tree to ' +
                  'provide a loading indicator or placeholder to display.',
              );
              suspended = true;
            } else {
              invariant(false, 'ReactDOMServer does not yet support Suspense.');
            }
          } else {
            throw err;
          }
        } finally {
          if (__DEV__) {
            popCurrentDebugStack();
          }
        }
        if (out.length <= this.suspenseDepth) {
          out.push('');
        }
        out[this.suspenseDepth] += outBuffer;
      }
      return out[0];
    } finally {
      ReactCurrentDispatcher.current = prevDispatcher;
      setCurrentPartialRenderer(prevPartialRenderer);
      resetHooksState();
    }
  }

  render(
    child: ReactNode | null,
    context: Object,
    parentNamespace: string,
  ): string {
    if (typeof child === 'string' || typeof child === 'number') {
      const text = '' + child;
      if (text === '') {
        return '';
      }
      if (this.makeStaticMarkup) {
        return escapeTextForBrowser(text);
      }
      if (this.previousWasTextNode) {
        return '<!-- -->' + escapeTextForBrowser(text);
      }
      this.previousWasTextNode = true;
      return escapeTextForBrowser(text);
    } else {
      let nextChild;
      ({child: nextChild, context} = resolve(child, context, this.threadID));
      if (nextChild === null || nextChild === false) {
        return '';
      } else if (!React.isValidElement(nextChild)) {
        if (nextChild != null && nextChild.$$typeof != null) {
          // Catch unexpected special types early.
          const $$typeof = nextChild.$$typeof;
          invariant(
            $$typeof !== REACT_PORTAL_TYPE,
            'Portals are not currently supported by the server renderer. ' +
              'Render them conditionally so that they only appear on the client render.',
          );
          // Catch-all to prevent an infinite loop if React.Children.toArray() supports some new type.
          invariant(
            false,
            'Unknown element-like object type: %s. This is likely a bug in React. ' +
              'Please file an issue.',
            ($$typeof: any).toString(),
          );
        }
        const nextChildren = toArray(nextChild);
        const frame: Frame = {
          type: null,
          domNamespace: parentNamespace,
          children: nextChildren,
          childIndex: 0,
          context: context,
          footer: '',
        };
        if (__DEV__) {
          ((frame: any): FrameDev).debugElementStack = [];
        }
        this.stack.push(frame);
        return '';
      }
      // Safe because we just checked it's an element.
      const nextElement = ((nextChild: any): ReactElement);
      const elementType = nextElement.type;

      if (typeof elementType === 'string') {
        return this.renderDOM(nextElement, context, parentNamespace);
      }

      switch (elementType) {
        // TODO: LegacyHidden acts the same as a fragment. This only works
        // because we currently assume that every instance of LegacyHidden is
        // accompanied by a host component wrapper. In the hidden mode, the host
        // component is given a `hidden` attribute, which ensures that the
        // initial HTML is not visible. To support the use of LegacyHidden as a
        // true fragment, without an extra DOM node, we would have to hide the
        // initial HTML in some other way.
        case REACT_LEGACY_HIDDEN_TYPE:
        case REACT_DEBUG_TRACING_MODE_TYPE:
        case REACT_STRICT_MODE_TYPE:
        case REACT_PROFILER_TYPE:
        case REACT_SUSPENSE_LIST_TYPE:
        case REACT_FRAGMENT_TYPE: {
          const nextChildren = toArray(
            ((nextChild: any): ReactElement).props.children,
          );
          const frame: Frame = {
            type: null,
            domNamespace: parentNamespace,
            children: nextChildren,
            childIndex: 0,
            context: context,
            footer: '',
          };
          if (__DEV__) {
            ((frame: any): FrameDev).debugElementStack = [];
          }
          this.stack.push(frame);
          return '';
        }
        case REACT_SUSPENSE_TYPE: {
          if (enableSuspenseServerRenderer) {
            const fallback = ((nextChild: any): ReactElement).props.fallback;
            if (fallback === undefined) {
              // If there is no fallback, then this just behaves as a fragment.
              const nextChildren = toArray(
                ((nextChild: any): ReactElement).props.children,
              );
              const frame: Frame = {
                type: null,
                domNamespace: parentNamespace,
                children: nextChildren,
                childIndex: 0,
                context: context,
                footer: '',
              };
              if (__DEV__) {
                ((frame: any): FrameDev).debugElementStack = [];
              }
              this.stack.push(frame);
              return '';
            }
            const fallbackChildren = toArray(fallback);
            const nextChildren = toArray(
              ((nextChild: any): ReactElement).props.children,
            );
            const fallbackFrame: Frame = {
              type: null,
              domNamespace: parentNamespace,
              children: fallbackChildren,
              childIndex: 0,
              context: context,
              footer: '<!--/$-->',
            };
            const frame: Frame = {
              fallbackFrame,
              type: REACT_SUSPENSE_TYPE,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '<!--/$-->',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
              ((fallbackFrame: any): FrameDev).debugElementStack = [];
            }
            this.stack.push(frame);
            this.suspenseDepth++;
            return '<!--$-->';
          } else {
            invariant(false, 'ReactDOMServer does not yet support Suspense.');
          }
        }
        // eslint-disable-next-line-no-fallthrough
        case REACT_SCOPE_TYPE: {
          if (enableScopeAPI) {
            const nextChildren = toArray(
              ((nextChild: any): ReactElement).props.children,
            );
            const frame: Frame = {
              type: null,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
            }
            this.stack.push(frame);
            return '';
          }
          invariant(
            false,
            'ReactDOMServer does not yet support scope components.',
          );
        }
        // eslint-disable-next-line-no-fallthrough
        default:
          break;
      }
      if (typeof elementType === 'object' && elementType !== null) {
        switch (elementType.$$typeof) {
          case REACT_FORWARD_REF_TYPE: {
            const element: ReactElement = ((nextChild: any): ReactElement)
            let nextChildren;
            const componentIdentity = {};
            prepareToUseHooks(componentIdentity);
            nextChildren = elementType.render(element.props, element.ref);
            nextChildren = finishHooks(
              elementType.render,
              element.props,
              nextChildren,
              element.ref,
            );
            nextChildren = toArray(nextChildren);
            const frame: Frame = {
              type: null,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
            }
            this.stack.push(frame);
            return '';
          }
          case REACT_MEMO_TYPE: {
            const element: ReactElement = ((nextChild: any): ReactElement);
            const nextChildren = [
              React.createElement(
                elementType.type,
                Object.assign({ref: element.ref}, element.props),
              ),
            ];
            const frame: Frame = {
              type: null,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
            }
            this.stack.push(frame);
            return '';
          }
          case REACT_PROVIDER_TYPE: {
            const provider: ReactProvider<any> = (nextChild: any);
            const nextProps = provider.props;
            const nextChildren = toArray(nextProps.children);
            const frame: Frame = {
              type: provider,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
            }

            this.pushProvider(provider);

            this.stack.push(frame);
            return '';
          }
          case REACT_CONTEXT_TYPE: {
            let reactContext = (nextChild: any).type;
            // The logic below for Context differs depending on PROD or DEV mode. In
            // DEV mode, we create a separate object for Context.Consumer that acts
            // like a proxy to Context. This proxy object adds unnecessary code in PROD
            // so we use the old behaviour (Context.Consumer references Context) to
            // reduce size and overhead. The separate object references context via
            // a property called "_context", which also gives us the ability to check
            // in DEV mode if this property exists or not and warn if it does not.
            if (__DEV__) {
              if ((reactContext: any)._context === undefined) {
                // This may be because it's a Context (rather than a Consumer).
                // Or it may be because it's older React where they're the same thing.
                // We only want to warn if we're sure it's a new React.
                if (reactContext !== reactContext.Consumer) {
                  if (!hasWarnedAboutUsingContextAsConsumer) {
                    hasWarnedAboutUsingContextAsConsumer = true;
                    console.error(
                      'Rendering <Context> directly is not supported and will be removed in ' +
                        'a future major release. Did you mean to render <Context.Consumer> instead?',
                    );
                  }
                }
              } else {
                reactContext = (reactContext: any)._context;
              }
            }
            const nextProps: any = (nextChild: any).props;
            const threadID = this.threadID;
            validateContextBounds(reactContext, threadID);
            const nextValue = reactContext[threadID];

            const nextChildren = toArray(nextProps.children(nextValue));
            const frame: Frame = {
              type: nextChild,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
            }
            this.stack.push(frame);
            return '';
          }
          // eslint-disable-next-line-no-fallthrough
          case REACT_FUNDAMENTAL_TYPE: {
            if (enableFundamentalAPI) {
              const fundamentalImpl = elementType.impl;
              const open = fundamentalImpl.getServerSideString(
                null,
                nextElement.props,
              );
              const getServerSideStringClose =
                fundamentalImpl.getServerSideStringClose;
              const close =
                getServerSideStringClose !== undefined
                  ? getServerSideStringClose(null, nextElement.props)
                  : '';
              const nextChildren =
                fundamentalImpl.reconcileChildren !== false
                  ? toArray(((nextChild: any): ReactElement).props.children)
                  : [];
              const frame: Frame = {
                type: null,
                domNamespace: parentNamespace,
                children: nextChildren,
                childIndex: 0,
                context: context,
                footer: close,
              };
              if (__DEV__) {
                ((frame: any): FrameDev).debugElementStack = [];
              }
              this.stack.push(frame);
              return open;
            }
            invariant(
              false,
              'ReactDOMServer does not yet support the fundamental API.',
            );
          }
          // eslint-disable-next-line-no-fallthrough
          case REACT_LAZY_TYPE: {
            const element: ReactElement = (nextChild: any);
            const lazyComponent: LazyComponent<any, any> = (nextChild: any)
              .type;
            // Attempt to initialize lazy component regardless of whether the
            // suspense server-side renderer is enabled so synchronously
            // resolved constructors are supported.
            const payload = lazyComponent._payload;
            const init = lazyComponent._init;
            const result = init(payload);
            const nextChildren = [
              React.createElement(
                result,
                Object.assign({ref: element.ref}, element.props),
              ),
            ];
            const frame: Frame = {
              type: null,
              domNamespace: parentNamespace,
              children: nextChildren,
              childIndex: 0,
              context: context,
              footer: '',
            };
            if (__DEV__) {
              ((frame: any): FrameDev).debugElementStack = [];
            }
            this.stack.push(frame);
            return '';
          }
        }
      }

      let info = '';
      if (__DEV__) {
        const owner = nextElement._owner;
        if (
          elementType === undefined ||
          (typeof elementType === 'object' &&
            elementType !== null &&
            Object.keys(elementType).length === 0)
        ) {
          info +=
            ' You likely forgot to export your component from the file ' +
            "it's defined in, or you might have mixed up default and " +
            'named imports.';
        }
        const ownerName = owner ? getComponentName(owner) : null;
        if (ownerName) {
          info += '\n\nCheck the render method of `' + ownerName + '`.`';
        }
      }
      invariant(
        false,
        'Element type is invalid: expected a string (for built-in ' +
          'components) or a class/function (for composite components) ' +
          'but got: %s.%s',
        elementType === null ? elementType : typeof elementType,
        info,
      );
    }
  }
}
