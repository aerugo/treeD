import { describe, it, expect } from 'vitest';
import { Vec3 } from '@/math/vec3';

describe('Vec3', () => {
  describe('creation', () => {
    it('creates a zero vector by default', () => {
      const v = new Vec3();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });

    it('creates a vector with given components', () => {
      const v = new Vec3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });

    it('creates from array', () => {
      const v = Vec3.fromArray([4, 5, 6]);
      expect(v.x).toBe(4);
      expect(v.y).toBe(5);
      expect(v.z).toBe(6);
    });
  });

  describe('operations', () => {
    it('adds two vectors', () => {
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(4, 5, 6);
      const result = a.add(b);
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });

    it('subtracts two vectors', () => {
      const a = new Vec3(4, 5, 6);
      const b = new Vec3(1, 2, 3);
      const result = a.sub(b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
      expect(result.z).toBe(3);
    });

    it('scales a vector', () => {
      const v = new Vec3(1, 2, 3);
      const result = v.scale(2);
      expect(result.x).toBe(2);
      expect(result.y).toBe(4);
      expect(result.z).toBe(6);
    });

    it('calculates dot product', () => {
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(4, 5, 6);
      expect(a.dot(b)).toBe(32); // 1*4 + 2*5 + 3*6 = 32
    });

    it('calculates cross product', () => {
      const a = new Vec3(1, 0, 0);
      const b = new Vec3(0, 1, 0);
      const result = a.cross(b);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });

    it('calculates length', () => {
      const v = new Vec3(3, 4, 0);
      expect(v.length()).toBe(5);
    });

    it('normalizes a vector', () => {
      const v = new Vec3(3, 4, 0);
      const n = v.normalize();
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
      expect(n.z).toBeCloseTo(0);
      expect(n.length()).toBeCloseTo(1);
    });

    it('handles zero vector normalization', () => {
      const v = new Vec3(0, 0, 0);
      const n = v.normalize();
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
      expect(n.z).toBe(0);
    });

    it('linearly interpolates between vectors', () => {
      const a = new Vec3(0, 0, 0);
      const b = new Vec3(10, 10, 10);
      const result = a.lerp(b, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
      expect(result.z).toBe(5);
    });
  });

  describe('static helpers', () => {
    it('provides unit vectors', () => {
      expect(Vec3.UP.y).toBe(1);
      expect(Vec3.RIGHT.x).toBe(1);
      expect(Vec3.FORWARD.z).toBe(-1);
    });
  });
});
