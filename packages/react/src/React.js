/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import ReactVersion from 'shared/ReactVersion';
import {
  REACT_FRAGMENT_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_ASYNC_MODE_TYPE
} from 'shared/ReactSymbols';

import {Component, PureComponent} from './ReactBaseClasses';
import {forEach, map} from './ReactChildren';


