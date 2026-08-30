/**
 * Test setup for the jsdom component suite.
 *
 * jsdom does not implement ResizeObserver, matchMedia or canvas, all of which
 * the Studio shell touches. These are the minimum shims required to render the
 * editor headlessly; they intentionally do not fake any engine behaviour.
 */

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverStub,
    configurable: true,
    writable: true,
  });
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
    configurable: true,
    writable: true,
  });
}

if (typeof window !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
  // The 2D/2.5D viewport paints through a 2D context; jsdom has no canvas
  // backend, so provide a no-op context rather than failing the render.
  const prototype = HTMLCanvasElement.prototype as unknown as {
    getContext: (id: string) => unknown;
  };
  const original = prototype.getContext;

  prototype.getContext = function getContext(id: string): unknown {
    if (id !== '2d') return original.call(this, id);

    const noop = (): void => undefined;
    return new Proxy(
      {
        canvas: this,
        measureText: () => ({ width: 10 }),
        createLinearGradient: () => ({ addColorStop: noop }),
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      },
      {
        get(target, property) {
          if (property in target) return (target as Record<string | symbol, unknown>)[property];
          return noop;
        },
        set(target, property, value) {
          (target as Record<string | symbol, unknown>)[property] = value;
          return true;
        },
      },
    );
  };
}
