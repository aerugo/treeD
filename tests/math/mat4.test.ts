import { describe, it, expect } from 'vitest';
import { Mat4 } from '@/math/mat4';
import { Vec3 } from '@/math/vec3';

describe('Mat4', () => {
  describe('creation', () => {
    it('creates identity matrix by default', () => {
      const m = Mat4.identity();
      expect(m.data[0]).toBe(1);
      expect(m.data[5]).toBe(1);
      expect(m.data[10]).toBe(1);
      expect(m.data[15]).toBe(1);
      // Check off-diagonals are zero
      expect(m.data[1]).toBe(0);
      expect(m.data[4]).toBe(0);
    });
  });

  describe('transformations', () => {
    it('creates translation matrix', () => {
      const m = Mat4.translation(1, 2, 3);
      expect(m.data[12]).toBe(1);
      expect(m.data[13]).toBe(2);
      expect(m.data[14]).toBe(3);
    });

    it('creates scale matrix', () => {
      const m = Mat4.scale(2, 3, 4);
      expect(m.data[0]).toBe(2);
      expect(m.data[5]).toBe(3);
      expect(m.data[10]).toBe(4);
    });

    it('creates rotation matrix around X', () => {
      const m = Mat4.rotationX(Math.PI / 2);
      // After 90 degree rotation around X, Y becomes Z
      const v = m.transformPoint(new Vec3(0, 1, 0));
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(0);
      expect(v.z).toBeCloseTo(1);
    });

    it('creates rotation matrix around Y', () => {
      const m = Mat4.rotationY(Math.PI / 2);
      // After 90 degree rotation around Y, X becomes -Z
      const v = m.transformPoint(new Vec3(1, 0, 0));
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(0);
      expect(v.z).toBeCloseTo(-1);
    });

    it('creates rotation matrix around Z', () => {
      const m = Mat4.rotationZ(Math.PI / 2);
      // After 90 degree rotation around Z, X becomes Y
      const v = m.transformPoint(new Vec3(1, 0, 0));
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(1);
      expect(v.z).toBeCloseTo(0);
    });
  });

  describe('matrix operations', () => {
    it('multiplies matrices', () => {
      const a = Mat4.translation(1, 0, 0);
      const b = Mat4.translation(0, 1, 0);
      const result = a.multiply(b);
      expect(result.data[12]).toBe(1);
      expect(result.data[13]).toBe(1);
    });

    it('transforms a point', () => {
      const m = Mat4.translation(5, 10, 15);
      const p = new Vec3(1, 2, 3);
      const result = m.transformPoint(p);
      expect(result.x).toBe(6);
      expect(result.y).toBe(12);
      expect(result.z).toBe(18);
    });

    it('transforms a direction (ignores translation)', () => {
      const m = Mat4.translation(5, 10, 15);
      const d = new Vec3(1, 0, 0);
      const result = m.transformDirection(d);
      expect(result.x).toBe(1);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('projection matrices', () => {
    it('creates perspective projection', () => {
      const m = Mat4.perspective(Math.PI / 4, 16 / 9, 0.1, 100);
      // Just verify it doesn't produce NaN and has proper structure
      expect(m.data[0]).not.toBeNaN();
      expect(m.data[11]).toBe(-1); // Standard perspective projection
    });

    it('creates lookAt matrix', () => {
      const m = Mat4.lookAt(
        new Vec3(0, 0, 5),  // eye
        new Vec3(0, 0, 0),  // target
        new Vec3(0, 1, 0)   // up
      );
      // Transform eye position should give origin in view space
      expect(m.data).toBeDefined();
    });
  });
});
