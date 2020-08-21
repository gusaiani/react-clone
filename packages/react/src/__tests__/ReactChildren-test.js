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

  it('should treat single arrayless child as being in array', () => {
    const context = {};
    const callback = jest.fn().mockImplementation(function(kid, index) {
      expect(this).toBe(context);
      return kid;
    });

    const simpleKid = <span />;
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
    expect(mappedChildren[0]).toEqual(<span key=".0" />);
  });

  it('should treat single child in array as expected', () => {
    const context = {};
    const callback = jest.fn().mockImplementation(function(kid, index) {
      expect(this).toBe(context);
      return kid;
    });

    const simpleKid = <span key="simple" />;
    const instance = <div>{[simpleKid]}</div>;
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

  it('should be called for each child', () => {
    const zero = <div key="keyZero" />;
    const one = null;
    const two = <div key="keyTwo" />;
    const three = null;
    const four = <div key="keyFour" />;
    const context = {};

    const callback = jest.fn().mockImplementation(function(kid) {
      expect(this).toBe(context);
      return kid;
    });

    const instance = (
      <div>
        {zero}
        {one}
        {two}
        {three}
        {four}
      </div>
    );

    function assertCalls() {
      expect(callback).toHaveBeenCalledWith(zero, 0);
      expect(callback).toHaveBeenCalledWith(one, 1);
      expect(callback).toHaveBeenCalledWith(two, 2);
      expect(callback).toHaveBeenCalledWith(three, 3);
      expect(callback).toHaveBeenCalledWith(four, 4);
      callback.mockClear();
    }

    React.Children.forEach(instance.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual([
      <div key=".$keyZero" />,
      <div key=".$keyTwo" />,
      <div key=".$keyFour" />,
    ]);
  });

  it('should traverse children of different kinds', () => {
    const div = <div key="divNode" />;
    const span = <span key="spanNode" />;
    const a = <a key="aNode" />;

    const context = {};
    const callback = jest.fn().mockImplementation(function(kid) {
      expect(this).toBe(context);
      return kid;
    });

    const instance = (
      <div>
        {div}
        {[[span]]}
        {[a]}
        {'string'}
        {1234}
        {true}
        {false}
        {null}
        {undefined}
      </div>
    );

    function assertCalls() {
      expect(callback).toHaveBeenCalledTimes(9);
      expect(callback).toHaveBeenCalledWith(div, 0);
      expect(callback).toHaveBeenCalledWith(span, 1);
      expect(callback).toHaveBeenCalledWith(a, 2);
      expect(callback).toHaveBeenCalledWith('string', 3);
      expect(callback).toHaveBeenCalledWith(1234, 4);
      expect(callback).toHaveBeenCalledWith(null, 5);
      expect(callback).toHaveBeenCalledWith(null, 6);
      expect(callback).toHaveBeenCalledWith(null, 7);
      expect(callback).toHaveBeenCalledWith(null, 8);
      callback.mockClear();
    }

    React.Children.forEach(instance.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual([
      <div key=".$divNode" />,
      <span key=".1:0:$spanNode" />,
      <a key=".2:$aNode" />,
      'string',
      1234,
    ]);
  });

  it('should be called for each child in nested structure', () => {
    const zero = <div key="keyZero" />;
    const one = null;
    const two = <div key="keyTwo" />;
    const three = null;
    const four = <div key="keyFour" />;
    const five = <div key="keyFive" />;

    const context = {};
    const callback = jest.fn().mockImplementation(function(kid) {
      return kid;
    });

    const instance = <div>{[[zero, one, two], [three, four], five]}</div>;

    function assertCalls() {
      expect(callback).toHaveBeenCalledTimes(6);
      expect(callback).toHaveBeenCalledWith(zero, 0);
      expect(callback).toHaveBeenCalledWith(one, 1);
      expect(callback).toHaveBeenCalledWith(two, 2);
      expect(callback).toHaveBeenCalledWith(three, 3);
      expect(callback).toHaveBeenCalledWith(four, 4);
      expect(callback).toHaveBeenCalledWith(five, 5);
      callback.mockClear();
    }

    React.Children.forEach(instance.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual([
      <div key=".0:$keyZero" />,
      <div key=".0:$keyTwo" />,
      <div key=".1:$keyFour" />,
      <div key=".$keyFive" />,
    ]);
  });

  it('should retain key across two mappings', () => {
    const zeroForceKey = <div key="keyZero" />;
    const oneForceKey = <div key="keyOne" />;
    const context = {};
    const callback = jest.fn().mockImplementation(function(kid) {
      expect(this).toBe(context);
      return kid;
    });

    const forcedKeys = (
      <div>
        {zeroForceKey}
        {oneForceKey}
      </div>
    );

    function assertCalls() {
      expect(callback).toHaveBeenCalledWith(zeroForceKey, 0);
      expect(callback).toHaveBeenCalledWith(oneForceKey, 1);
      callback.mockClear();
    }

    React.Children.forEach(forcedKeys.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      forcedKeys.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual([
      <div key=".$keyZero" />,
      <div key=".$keyOne" />,
    ]);
  });

  it('should be called for each child in an iterable without keys', () => {
    const threeDivIterable = {
      '@@iterator': function() {
        let i = 0;
        return {
          next: function() {
            if (i++ < 3) {
              return {value: <div />, done: false};
            } else {
              return {value: undefined, done: true};
            }
          },
        };
      },
    };

    const context = {};
    const callback = jest.fn().mockImplementation(function(kid) {
      expect(this).toBe(context);
      return kid;
    });

    let instance;
    expect(() => (instance = <div>{threeDivIterable}</div>)).toErrorDev(
      'Warning: Each child in a list should have a unique "key" prop.',
    );

    function assertCalls() {
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(<div />, 0);
      expect(callback).toHaveBeenCalledWith(<div />, 1);
      expect(callback).toHaveBeenCalledWith(<div />, 2);
      callback.mockClear();
    }

    React.Children.forEach(instance.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual([
      <div key=".0" />,
      <div key=".1" />,
      <div key=".2" />,
    ]);
  });

  it('should be called for each child in an iterable with keys', () => {
    const threeDivIterable = {
      '@@iterator': function() {
        let i = 0;
        return {
          next: function() {
            if (i++ < 3) {
              return {value: <div key={'#' + i} />, done: false};
            } else {
              return {value: undefined, done: true};
            }
          },
        };
      },
    };

    const context = {};
    const callback = jest.fn().mockImplementation(function(kid) {
      expect(this).toBe(context);
      return kid;
    });

    const instance = <div>{threeDivIterable}</div>;

    function assertCalls() {
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(<div key="#1" />, 0);
      expect(callback).toHaveBeenCalledWith(<div key="#2" />, 1);
      expect(callback).toHaveBeenCalledWith(<div key="#3" />, 2);
      callback.mockClear();
    }

    React.Children.forEach(instance.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual([
      <div key=".$#1" />,
      <div key=".$#2" />,
      <div key=".$#3" />,
    ]);
  });

  it('should not enumerate enumerable numbers (#4776)', () => {
    /*eslint-disable no-extend-native */
    Number.prototype['@@iterator'] = function() {
      throw new Error('number iterator called');
    };
    /*eslint-enable no-extend-native */

    try {
      const instance = (
        <div>
          {5}
          {12}
          {13}
        </div>
      );

      const context = {};
      const callback = jest.fn().mockImplementation(function(kid) {
        expect(this).toBe(context);
        return kid;
      });

      const assertCalls = function() {
        expect(callback).toHaveBeenCalledTimes(3);
        expect(callback).toHaveBeenCalledWith(5, 0);
        expect(callback).toHaveBeenCalledWith(12, 1);
        expect(callback).toHaveBeenCalledWith(13, 2);
        callback.mockClear();
      };

      React.Children.forEach(instance.props.children, callback, context);
      assertCalls();

      const mappedChildren = React.Children.map(
        instance.props.children,
        callback,
        context,
      );
      assertCalls();
      expect(mappedChildren).toEqual([5, 12, 13]);
    } finally {
      delete Number.prototype['@@iterator'];
    }
  });

  it('should allow extension of native prototypes', () => {
    /*eslint-disable no-extend-native */
    String.prototype.key = 'react';
    Number.prototype.key = 'rocks';
    /*eslint-enable no-extend-native */

    const instance = (
      <div>
        {'a'}
        {13}
      </div>
    );

    const context = {};
    const callback = jest.fn().mockImplementation(function(kid) {
      expect(this).toBe(context);
      return kid;
    });

    function assertCalls() {
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('a', 0);
      expect(callback).toHaveBeenCalledWith(13, 1);
      callback.mockClear();
    }

    React.Children.forEach(instance.props.children, callback, context);
    assertCalls();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      context,
    );
    assertCalls();
    expect(mappedChildren).toEqual(['a', 13]);

    delete String.prototype.key;
    delete Number.prototype.key;
  });

  it('should pass key to returned component', () => {
    const mapFn = function(kid, index) {
      return <div>{kid}</div>;
    };

    const simpleKid = <span key="simple" />;

    const instance = <div>{simpleKid}</div>;
    const mappedChildren = React.Children.map(instance.props.children, mapFn);

    expect(React.Children.count(mappedChildren)).toBe(1);
    expect(mappedChildren[0]).not.toBe(simpleKid);
    expect(mappedChildren[0].props.children).toBe(simpleKid);
    expect(mappedChildren[0].key).toBe('.$simple');
  });

  it('should invoke callback with the right context', () => {
    let lastContext;
    const callback = function(kid, index) {
      lastContext = this;
      return this;
    };

    // TODO: Use an object to test, after non-object fragments has fully landed.
    const scopeTester = 'scope tester';

    const simpleKid = <span key="simple" />;
    const instance = <div>{simpleKid}</div>;
    React.Children.forEach(instance.props.children, callback, scopeTester);
    expect(lastContext).toBe(scopeTester);

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
      scopeTester,
    );

    expect(React.Children.count(mappedChildren)).toBe(1);
    expect(mappedChildren[0]).toBe(scopeTester);
  });

  it('should be called for each child', () => {
    const zero = <div key="keyZero" />;
    const one = null;
    const two = <div key="keyTwo" />;
    const three = null;
    const four = <div key="keyFour" />;

    const mapped = [
      <div key="giraffe" />, // Key should be joined to obj key
      null, // Key should be added even if we don't supply it!
      <div />, // Key should be added even if not supplied!
      <span />, // Map from null to something.
      <div key="keyFour" />,
    ];
    const callback = jest.fn().mockImplementation(function(kid, index) {
      return mapped[index];
    });

    const instance = (
      <div>
        {zero}
        {one}
        {two}
        {three}
        {four}
      </div>
    );

    React.Children.forEach(instance.props.children, callback);
    expect(callback).toHaveBeenCalledWith(zero, 0);
    expect(callback).toHaveBeenCalledWith(one, 1);
    expect(callback).toHaveBeenCalledWith(two, 2);
    expect(callback).toHaveBeenCalledWith(three, 3);
    expect(callback).toHaveBeenCalledWith(four, 4);
    callback.mockClear();

    const mappedChildren = React.Children.map(
      instance.props.children,
      callback,
    );
    expect(callback).toHaveBeenCalledTimes(5);
    expect(React.Children.count(mappedChildren)).toBe(4);
    // Keys default to indices.
    expect([
      mappedChildren[0].key,
      mappedChildren[1].key,
      mappedChildren[2].key,
      mappedChildren[3].key,
    ]).toEqual(['giraffe/.$keyZero', '.$keyTwo', '.3', '.$keyFour']);

    expect(callback).toHaveBeenCalledWith(zero, 0);
    expect(callback).toHaveBeenCalledWith(one, 1);
    expect(callback).toHaveBeenCalledWith(two, 2);
    expect(callback).toHaveBeenCalledWith(three, 3);
    expect(callback).toHaveBeenCalledWith(four, 4);

    expect(mappedChildren[0]).toEqual(<div key="giraffe/.$keyZero" />);
    expect(mappedChildren[1]).toEqual(<div key=".$keyTwo" />);
    expect(mappedChildren[2]).toEqual(<span key=".3" />);
    expect(mappedChildren[3]).toEqual(<div key=".$keyFour" />);
  });
});
