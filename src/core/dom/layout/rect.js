/**
 * TODO(rcebulko): Migrate the actual ViewportInterface into core or an extern.
 * @typedef {{
 *   getHeight: function(this:ViewportInterfaceDef):number,
 *   getWidth: function(this:ViewportInterfaceDef):number,
 * }}
 */
let ViewportInterfaceDef;

/**
 * The structure that combines position and size for an element. The exact
 * interpretation of position and size depends on the use case.
 *
 * @typedef {{
 *   top: number,
 *   bottom: number,
 *   left: number,
 *   right: number,
 *   width: number,
 *   height: number,
 *   x: number,
 *   y: number
 * }}
 */
export let LayoutRectDef;

/**
 * The structure that contains the size for an element. The exact
 * interpretation of the size depends on the use case.
 *
 * @typedef {{
 *   width: number,
 *   height: number,
 * }}
 */
export let LayoutSizeDef;

/**
 * The structure that represents the margins of an Element.
 *
 * @typedef {{
 *   top: number,
 *   right: number,
 *   bottom: number,
 *   left: number
 * }}
 */
export let LayoutMarginsDef;

/**
 * The structure that represents a requested change to the margins of an
 * Element. Any new values specified will replace existing ones (rather than
 * being additive).
 *
 * @typedef {{
 *   top: (number|undefined),
 *   right: (number|undefined),
 *   bottom: (number|undefined),
 *   left: (number|undefined)
 * }}
 */
export let LayoutMarginsChangeDef;

/**
 * RelativePositions_Enum
 *
 * Describes the relative position of an element to another (whether the
 * first is inside the second, on top of the second or on the bottom
 * @enum {string}
 */
export const RelativePositions_Enum = {
  INSIDE: 'inside',
  TOP: 'top',
  BOTTOM: 'bottom',
};

/**
 * Creates a layout rect based on the left, top, width and height parameters
 * in that order.
 * @param {number} left
 * @param {number} top
 * @param {number} width
 * @param {number} height
 * @return {LayoutRectDef}
 */
export function layoutRectLtwh(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
  };
}

/**
 * Creates a layout rect based on the DOMRect, e.g. obtained from calling
 * getBoundingClientRect.
 * @param {ClientRect} rect
 * @return {LayoutRectDef}
 */
export function layoutRectFromDomRect(rect) {
  return layoutRectLtwh(
    Number(rect.left),
    Number(rect.top),
    Number(rect.width),
    Number(rect.height)
  );
}

/**
 * Returns true if the specified two rects overlap by a single pixel.
 * @param {LayoutRectDef|ClientRect} r1
 * @param {LayoutRectDef|ClientRect} r2
 * @return {boolean}
 */
export function rectsOverlap(r1, r2) {
  return (
    r1.top <= r2.bottom &&
    r2.top <= r1.bottom &&
    r1.left <= r2.right &&
    r2.left <= r1.right
  );
}

/**
 * Returns the intersection between a, b or null if there is none.
 * @param {...?LayoutRectDef|undefined} var_args
 * @return {?LayoutRectDef}
 */
export function rectIntersection(var_args) {
  let x0 = -Infinity;
  let x1 = Infinity;
  let y0 = -Infinity;
  let y1 = Infinity;
  for (let i = 0; i < arguments.length; i++) {
    const current = arguments[i];
    if (!current) {
      continue;
    }
    x0 = Math.max(x0, current.left);
    x1 = Math.min(x1, current.left + current.width);
    y0 = Math.max(y0, current.top);
    y1 = Math.min(y1, current.top + current.height);
    if (x1 < x0 || y1 < y0) {
      return null;
    }
  }
  if (x1 == Infinity) {
    return null;
  }
  return layoutRectLtwh(x0, y0, x1 - x0, y1 - y0);
}

/**
 * Returns the position of r2 relative to r1
 * @param {LayoutRectDef} r1
 * @param {LayoutRectDef} r2
 * @return {RelativePositions_Enum}
 */
export function layoutRectsRelativePos(r1, r2) {
  if (r1.top < r2.top) {
    return RelativePositions_Enum.TOP;
  } else if (r1.bottom > r2.bottom) {
    return RelativePositions_Enum.BOTTOM;
  } else {
    return RelativePositions_Enum.INSIDE;
  }
}

/**
 * Determines if any portion of a layoutBox would be onscreen in the given
 * viewport, when scrolled to the specified position.
 * @param {LayoutRectDef} layoutBox
 * @param {ViewportInterfaceDef} viewport
 * @param {number} scrollPos
 * @return {RelativePositions_Enum}
 */
export function layoutPositionRelativeToScrolledViewport(
  layoutBox,
  viewport,
  scrollPos
) {
  const scrollLayoutBox = layoutRectFromDomRect(
    /** @type {ClientRect} */ ({
      top: scrollPos,
      bottom: scrollPos + viewport.getHeight(),
      left: 0,
      right: viewport.getWidth(),
    })
  );
  if (rectsOverlap(layoutBox, scrollLayoutBox)) {
    return RelativePositions_Enum.INSIDE;
  } else {
    return layoutRectsRelativePos(layoutBox, scrollLayoutBox);
  }
}

/**
 * Expand the layout rect using multiples of width and height.
 * @param {LayoutRectDef} rect Original rect.
 * @param {number} dw Expansion in width, specified as a multiple of width.
 * @param {number} dh Expansion in height, specified as a multiple of height.
 * @return {LayoutRectDef}
 */
export function expandLayoutRect(rect, dw, dh) {
  return layoutRectLtwh(
    rect.left - rect.width * dw,
    rect.top - rect.height * dh,
    rect.width * (1 + dw * 2),
    rect.height * (1 + dh * 2)
  );
}

/**
 * Moves the layout rect using dx and dy.
 * @param {LayoutRectDef} rect Original rect.
 * @param {number} dx Move horizontally with this value.
 * @param {number} dy Move vertically with this value.
 * @return {LayoutRectDef}
 */
export function moveLayoutRect(rect, dx, dy) {
  if ((dx == 0 && dy == 0) || (rect.width == 0 && rect.height == 0)) {
    return rect;
  }
  return layoutRectLtwh(rect.left + dx, rect.top + dy, rect.width, rect.height);
}

/**
 * @param {LayoutMarginsDef} margins
 * @param {LayoutMarginsChangeDef} change
 * @return {boolean}
 */
export function areMarginsChanged(margins, change) {
  return (
    (change.top !== undefined && change.top != margins.top) ||
    (change.right !== undefined && change.right != margins.right) ||
    (change.bottom !== undefined && change.bottom != margins.bottom) ||
    (change.left !== undefined && change.left != margins.left)
  );
}

/**
 * @param {LayoutRectDef} from
 * @param {LayoutRectDef} to
 * @return {boolean}
 */
export function layoutRectSizeEquals(from, to) {
  return from.width == to.width && from.height === to.height;
}

/**
 * @param {?LayoutRectDef} r1
 * @param {?LayoutRectDef} r2
 * @return {boolean}
 */
export function layoutRectEquals(r1, r2) {
  if (!r1 || !r2) {
    return false;
  }
  return (
    r1.left == r2.left &&
    r1.top == r2.top &&
    r1.width == r2.width &&
    r1.height == r2.height
  );
}

/**
 * @param {LayoutMarginsChangeDef|undefined} marginsChange
 * @return {LayoutMarginsChangeDef|undefined}
 */
export function cloneLayoutMarginsChangeDef(marginsChange) {
  if (!marginsChange) {
    return marginsChange;
  }
  return {
    top: marginsChange.top,
    bottom: marginsChange.bottom,
    left: marginsChange.left,
    right: marginsChange.right,
  };
}

/**
 * @param {LayoutRectDef|ClientRect|DOMRect} rect
 * @return {LayoutSizeDef}
 */
export function layoutSizeFromRect(rect) {
  const {height, width} = rect;
  return {width, height};
}
