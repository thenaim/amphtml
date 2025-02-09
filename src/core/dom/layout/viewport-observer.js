import {isIframed} from '#core/dom';
import {removeItem} from '#core/types/array';
import {getWin} from '#core/window';

/**
 * Returns an IntersectionObserver tracking the Viewport.
 *
 * @param {function(Array<IntersectionObserverEntry>):void} ioCallback
 * @param {Window} win
 * @param {{
 *   threshold?: (number|!Array<number>|undefined),
 *   needsRootBounds?: (boolean|undefined),
 * }=} opts
 * @return {IntersectionObserver}
 */
export function createViewportObserver(ioCallback, win, opts = {}) {
  const {needsRootBounds, threshold} = opts;
  // The Document -> Element type conversion is necessary to satisfy the
  // `IntersectionObserver` constructor extern that only accepts `Element`.
  const root =
    isIframed(win) && needsRootBounds
      ? /** @type {?} */ (win.document)
      : undefined;
  return new win.IntersectionObserver(ioCallback, {
    threshold,
    root,
  });
}

/** @type {WeakMap<Window, IntersectionObserver>} */
const viewportObservers = new WeakMap();

/** @type {WeakMap<Element, Array<function(IntersectionObserverEntry):void>>} */
const viewportCallbacks = new WeakMap();

/**
 * Lazily creates an IntersectionObserver per Window to track when elements
 * enter and exit the viewport. Fires viewportCallback when this happens.
 *
 * @param {Element} element
 * @param {function(IntersectionObserverEntry):void} callback
 * @return {UnlistenCallback} clean up closure to unobserve the element
 */
export function observeIntersections(element, callback) {
  const win = getWin(element);
  let viewportObserver = viewportObservers.get(win);
  if (!viewportObserver) {
    viewportObservers.set(
      win,
      (viewportObserver = createViewportObserver(ioCallback, win))
    );
  }
  let callbacks = viewportCallbacks.get(element);
  if (!callbacks) {
    callbacks = [];
    viewportCallbacks.set(element, callbacks);
  }
  callbacks.push(callback);
  viewportObserver.observe(element);
  return () => {
    unobserveIntersections(element, callback);
  };
}

/**
 * Unsubscribes a callback from receiving IntersectionObserver updates for an element.
 *
 * @param {Element} element
 * @param {function(IntersectionObserverEntry):void} callback
 */
function unobserveIntersections(element, callback) {
  const callbacks = viewportCallbacks.get(element);
  if (!callbacks) {
    return;
  }
  if (!removeItem(callbacks, callback)) {
    return;
  }
  if (callbacks.length) {
    return;
  }
  // If an element has no more observer callbacks, then unobserve it.
  const win = getWin(element);
  const viewportObserver = viewportObservers.get(win);
  viewportObserver?.unobserve(element);
  viewportCallbacks.delete(element);
}

/**
 * Call the registered callbacks for each element that has crossed the
 * viewport boundary.
 *
 * @param {Array<IntersectionObserverEntry>} entries
 */
function ioCallback(entries) {
  const seen = new Set();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const {target} = entry;
    if (seen.has(target)) {
      continue;
    }
    seen.add(target);
    const callbacks = viewportCallbacks.get(target);
    if (!callbacks) {
      continue;
    }
    for (let k = 0; k < callbacks.length; k++) {
      const callback = callbacks[k];
      callback(entry);
    }
  }
}
