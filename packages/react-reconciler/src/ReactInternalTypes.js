/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

type BasicStateAction<S> = (S => S) | S;

export type Dispatcher = {|
  readContext<T>(
    context: ReactContext<T>,
    observedBits: void | number | boolean,
  ): T,
  useState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>],
  useReducer<S, I, A>(
    reducer: (S, A) => S,
    initialArg: I,
    init?: (I) => S,
  ): [S, Dispatch<A>],
  useContext<T>(
    context: ReactContext<T>,
    observedBits: void | number | boolean,
  ): T,
  useRef<T>(initialValue: T): {|current: T|},
  useEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useLayoutEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useCallback<T>(callback: T, deps: Array<mixed> | void | null): T,
  useMemo<T>(nextCreate: () => T, deps: Array<mixed> | void | null): T,
  useImperativeHandle<T>(
    ref: {|current: T | null|} | ((inst: T | null) => mixed) | null | void,
    create: () => T,
    deps: Array<mixed> | void | null,
  ): void,
  useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void,
}

