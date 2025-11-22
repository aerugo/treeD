/**
 * 3D Vector class for the TreeD engine
 */
export class Vec3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  static fromArray(arr: number[]): Vec3 {
    return new Vec3(arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 0);
  }

  static get ZERO(): Vec3 {
    return new Vec3(0, 0, 0);
  }

  static get UP(): Vec3 {
    return new Vec3(0, 1, 0);
  }

  static get DOWN(): Vec3 {
    return new Vec3(0, -1, 0);
  }

  static get RIGHT(): Vec3 {
    return new Vec3(1, 0, 0);
  }

  static get LEFT(): Vec3 {
    return new Vec3(-1, 0, 0);
  }

  static get FORWARD(): Vec3 {
    return new Vec3(0, 0, -1);
  }

  static get BACK(): Vec3 {
    return new Vec3(0, 0, 1);
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vec3 {
    const len = this.length();
    if (len === 0) return new Vec3(0, 0, 0);
    return this.scale(1 / len);
  }

  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  negate(): Vec3 {
    return new Vec3(-this.x, -this.y, -this.z);
  }

  distanceTo(v: Vec3): number {
    return this.sub(v).length();
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  toFloat32Array(): Float32Array {
    return new Float32Array([this.x, this.y, this.z]);
  }

  equals(v: Vec3, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  toString(): string {
    return `Vec3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
  }
}
