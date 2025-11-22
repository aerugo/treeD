import { describe, it, expect } from 'vitest';
import { Quaternion } from '@/math/quaternion';
import { Vec3 } from '@/math/vec3';

describe('Quaternion', () => {
  describe('creation', () => {
    it('creates identity quaternion by default', () => {
      const q = Quaternion.identity();
      expect(q.x).toBe(0);
      expect(q.y).toBe(0);
      expect(q.z).toBe(0);
      expect(q.w).toBe(1);
    });

    it('creates from axis-angle', () => {
      const q = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI);
      expect(q.w).toBeCloseTo(0);
      expect(q.y).toBeCloseTo(1);
    });

    it('creates from Euler angles', () => {
      const q = Quaternion.fromEuler(0, Math.PI / 2, 0);
      // 90 degree rotation around Y
      expect(q.length()).toBeCloseTo(1);
    });
  });

  describe('operations', () => {
    it('multiplies quaternions', () => {
      const a = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
      const b = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
      const result = a.multiply(b);
      // Two 90 degree rotations = 180 degrees
      expect(result.w).toBeCloseTo(0);
    });

    it('rotates a vector', () => {
      const q = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
      const v = new Vec3(1, 0, 0);
      const result = q.rotate(v);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(-1);
    });

    it('normalizes quaternion', () => {
      const q = new Quaternion(1, 2, 3, 4);
      const n = q.normalize();
      expect(n.length()).toBeCloseTo(1);
    });

    it('calculates conjugate', () => {
      const q = new Quaternion(1, 2, 3, 4);
      const c = q.conjugate();
      expect(c.x).toBe(-1);
      expect(c.y).toBe(-2);
      expect(c.z).toBe(-3);
      expect(c.w).toBe(4);
    });

    it('spherically interpolates (slerp)', () => {
      const a = Quaternion.identity();
      const b = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI);
      const result = a.slerp(b, 0.5);
      // Halfway between 0 and 180 degrees
      expect(result.length()).toBeCloseTo(1);
    });
  });

  describe('conversion', () => {
    it('converts to rotation matrix', () => {
      const q = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
      const m = q.toMat4();
      const v = m.transformPoint(new Vec3(1, 0, 0));
      expect(v.x).toBeCloseTo(0);
      expect(v.z).toBeCloseTo(-1);
    });
  });
});
