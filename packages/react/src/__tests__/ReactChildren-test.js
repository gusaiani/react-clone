/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactChildren', () => {
  let React;
  let ReactTestUtils;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactTestUtils = require('react-dom/test-utils');
  });

  it('should support identity for simple', () => {
    const context = {};
    const callback = jest.fn().mockImplementation(function(kid, index) {
      expect(this).toBe(context);
      return kid;
    });

    const simpleKid = <span key="simple" />;

    // First pass children into a component to fully simulate what happens when
    // using structures that arrive from transforms.

    const instance = <div>{simpleKid}</div>;
    React.Children.forEach(instance.props.children, callback, context);
    expect(callback).toHaveBeenCalledWith(simpleKid, 0);
    callback.mockClear();
    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    expect(callback).toHaveBeenCalledWith(simpleKid, 0);
    expect(mappedChildren[0]).toEqual(<span key=".$simple" />);
  });

  it('should support Portal components', () => {
    const context = {};
    const callback = jest.fn().mockImplementation(function(kid, index) {
      expect(this).toBe(context);
      return kid;
    });
    const ReactDOM = require('react-dom');
    const portalContainer = document.createElement('div');

    const simpleChild = <span key="simple" />;
    const reactPortal = ReactDOM.createPortal(simpleChild, portalContainer);

    const parentInstance = <div>{reactPortal}</div>;
    React.Children.forEach(parentInstance.props.children, callback, context);
    expect(callback).toHaveBeenCalledWith(reactPortal, 0);
    callback.mockClear();
    const mappedChildren = React.Children.map(
      parentInstance.props.children,
      callback,
      context,
    );
    expect(callback).toHaveBeenCalledWith(reactPortal, 0);
    expect(mappedChildren[0]).toEqual(reactPortal);
  });
})
