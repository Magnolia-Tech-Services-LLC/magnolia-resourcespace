/**
 * Assign capability methods to a client instance using tamper-proof property definitions.
 *
 * Unlike Object.assign, this uses Object.defineProperty with writable: false and
 * configurable: false, preventing runtime mutation of capability methods.
 * This is a defense-in-depth measure against prototype pollution and method tampering.
 */
export function assignCapability<T extends object, U extends object>(
  target: T,
  methods: U,
): T & U {
  for (const [key, value] of Object.entries(methods)) {
    Object.defineProperty(target, key, {
      value,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
  return target as T & U;
}
