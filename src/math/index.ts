export { Vec3 } from './vec3';
export { Mat4 } from './mat4';
export { Quaternion } from './quaternion';

/**
 * Common math utilities
 */
export const MathUtils = {
  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },

  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  },

  smoothstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },

  smootherstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  },

  randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  },

  randomInt(min: number, max: number): number {
    return Math.floor(MathUtils.randomRange(min, max + 1));
  },

  degToRad(degrees: number): number {
    return degrees * MathUtils.DEG_TO_RAD;
  },

  radToDeg(radians: number): number {
    return radians * MathUtils.RAD_TO_DEG;
  },
};
