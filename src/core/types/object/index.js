/* @const */
const {hasOwnProperty: hasOwn_, toString: toString_} = Object.prototype;

/**
 * Determines if value is actually an Object.
 * @param {*} value
 * @return {value is Object}
 */
export function isObject(value) {
  return toString_.call(value) === '[object Object]';
}

/**
 * Returns a map-like object.
 * If opt_initial is provided, copies its own properties into the
 * newly created object.
 * @param {T=} opt_initial This should typically be an object literal.
 * @return {T}
 * @template T
 */
export function map(opt_initial) {
  const obj = Object.create(null);
  if (opt_initial) {
    Object.assign(obj, opt_initial);
  }
  return obj;
}

/**
 * Return an empty JsonObject or makes the passed in object literal
 * an JsonObject.
 * The JsonObject type is just a simple object that is at-dict.
 * See
 * https://github.com/google/closure-compiler/wiki/@struct-and-@dict-Annotations
 * for what a dict is type-wise.
 * The linter enforces that the argument is, in fact, at-dict like.
 * @param {Object=} opt_initial
 * @return {JsonObject}
 */
export function dict(opt_initial) {
  // We do not copy. The linter enforces that the passed in object is a literal
  // and thus the caller cannot have a reference to it.
  return /** @type {JsonObject} */ (opt_initial || {});
}

/**
 * Checks if the given key is a property in the map.
 *
 * @param {T}  obj a map like property.
 * @param {string}  key
 * @return {boolean}
 * @template T
 */
export function hasOwn(obj, key) {
  return hasOwn_.call(obj, key);
}

/**
 * Returns obj[key] iff key is obj's own property (is not inherited).
 * Otherwise, returns undefined.
 *
 * @param {Object} obj
 * @param {string} key
 * @return {*}
 */
export function ownProperty(obj, key) {
  if (hasOwn(obj, key)) {
    return obj[key];
  } else {
    return undefined;
  }
}

/** @typedef {{t: Object, s: Object, d: number}} DeepMergeTuple */

/**
 * Deep merges source into target.
 *
 * @param {Object} target
 * @param {Object} source
 * @param {number} depth The maximum merge depth. If exceeded, Object.assign
 *                       will be used instead.
 * @return {Object}
 * @throws {Error} If source contains a circular reference.
 * Note: Only nested objects are deep-merged, primitives and arrays are not.
 */
export function deepMerge(target, source, depth = 10) {
  // Keep track of seen objects to detect recursive references.
  const seen = [];

  /** @type {DeepMergeTuple[]} */
  const queue = [];
  queue.push({t: target, s: source, d: 0});

  // BFS to ensure objects don't have recursive references at shallower depths.
  while (queue.length > 0) {
    const {d, s, t} = /** @type {DeepMergeTuple} */ (queue.shift());
    if (seen.includes(s)) {
      throw new Error('Source object has a circular reference.');
    }
    seen.push(s);
    if (t === s) {
      continue;
    }
    if (d > depth) {
      Object.assign(t, s);
      continue;
    }
    for (const key of Object.keys(s)) {
      const newValue = s[key];
      // Perform a deep merge IFF both target and source have the same key
      // whose corresponding values are objects.
      if (hasOwn(t, key)) {
        const oldValue = t[key];
        if (isObject(newValue) && isObject(oldValue)) {
          queue.push({t: oldValue, s: newValue, d: d + 1});
          continue;
        }
      }
      t[key] = newValue;
    }
  }
  return target;
}

/**
 * @param {Object} o An object to remove properties from
 * @param {Array<string>} props A list of properties to remove from the Object
 * @return {Object} An object with the given properties removed
 */
export function omit(o, props) {
  return Object.keys(o).reduce((acc, key) => {
    if (!props.includes(key)) {
      acc[key] = o[key];
    }
    return acc;
  }, {});
}

/**
 * @param {Object|null|undefined} o1
 * @param {Object|null|undefined} o2
 * @return {boolean}
 */
export function objectsEqualShallow(o1, o2) {
  if (o1 == null || o2 == null) {
    // Null is only equal to null, and undefined to undefined.
    return o1 === o2;
  }

  for (const k in o1) {
    if (o1[k] !== o2[k]) {
      return false;
    }
  }
  for (const k in o2) {
    if (o2[k] !== o1[k]) {
      return false;
    }
  }

  return true;
}

/**
 * @param {T} obj
 * @param {string} prop
 * @param {function(T, string):R} factory
 * @return {R}
 * @template T,R
 */
export function memo(obj, prop, factory) {
  let result = /** @type {undefined|R} */ (obj[prop]);
  if (result === undefined) {
    result = factory(obj, prop);
    obj[prop] = result;
  }
  return /** @type {R} */ (result);
}

/**
 * Recreates objects with prototype-less copies.
 * @param {JsonObject} obj
 * @return {JsonObject}
 */
export function recreateNonProtoObject(obj) {
  const copy = map();
  for (const k in obj) {
    if (!hasOwn(obj, k)) {
      continue;
    }
    const v = obj[k];
    copy[k] = isObject(v) ? recreateNonProtoObject(v) : v;
  }
  return /** @type {JsonObject} */ (copy);
}

/**
 * Returns a value from an object for a field-based expression. The expression
 * is a simple nested dot-notation of fields, such as `field1.field2`. If any
 * field in a chain does not exist or is not an object or array, the returned
 * value will be `undefined`.
 *
 * @param {JsonObject} obj
 * @param {string} expr
 * @return {*}
 */
export function getValueForExpr(obj, expr) {
  // The `.` indicates "the object itself".
  if (expr == '.') {
    return obj;
  }
  // Otherwise, navigate via properties.
  const parts = expr.split('.');
  /** @type {*} */
  let value = obj;
  for (const part of parts) {
    if (
      part &&
      value &&
      value[part] !== undefined &&
      typeof value == 'object' &&
      hasOwn(value, part)
    ) {
      value = value[part];
      continue;
    }
    value = undefined;
    break;
  }
  return value;
}
