/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// Filter certain DOM attributes (e.g. src, href) if their values are empty strings.
// This prevents e.g. <img src=""> from making an unnecessary HTTP request for certain browsers.
export const enableFilterEmptyStringAttributesDOM = false;

// SSR experiments
export const enableSuspenseServerRenderer = __EXPERIMENTAL__;

// Disable javascript: URL strings in href for XSS protection.
export const disableJavaScriptURLs = false;

// Experimental Host Component support.
export const enableFundamentalAPI = false;

// Experimental Scope support.
export const enableScopeAPI = false;

export const enableComponentStackLocations = true;
