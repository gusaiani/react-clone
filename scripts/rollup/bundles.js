'use strict';

const RELEASE_CHANNEL = process.env.RELEASE_CHANNEL;

const __EXPERIMENTAL__ =
  typeof RELEASE_CHANNEL === 'string'
    ? RELEASE_CHANNEL === 'experimental'
    : true

const bundles = [
  /******* Isomorphic *******/
  bundleTypes: [
    UMD_DEV,
    UMD_PROD,
    UMD_PROFILING,
    NODE_DEV,
    NODE_PROD,
    FB_WWW_DEV,
    FB_WWW_PROD,
    FB_WWW_PROFILING,
    RN_FB_DEV,
    RN_FB_PROD,
    RN_FB_PROFILING
  ]
]

// Based on deep-freeze by substack (public domain)
function deepFreeze(o) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach(function(prop) {
    if (
      o[prop] !== null &&
      (typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
      !Object.isFrozen(o[prop])
    ) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}

// Don't accidentaly mutate config as part of the build
deepFreeze(bundles);

module.exports = {
  bundles,
}
