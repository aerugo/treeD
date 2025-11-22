import { Vec3 } from './vec3';

/**
 * 4x4 Matrix class for the TreeD engine
 * Column-major order (OpenGL convention)
 */
export class Mat4 {
  public data: Float32Array;

  constructor(data?: Float32Array | number[]) {
    if (data) {
      this.data = data instanceof Float32Array ? data : new Float32Array(data);
    } else {
      this.data = new Float32Array(16);
    }
  }

  static identity(): Mat4 {
    const m = new Mat4();
    m.data[0] = 1;
    m.data[5] = 1;
    m.data[10] = 1;
    m.data[15] = 1;
    return m;
  }

  static translation(x: number, y: number, z: number): Mat4 {
    const m = Mat4.identity();
    m.data[12] = x;
    m.data[13] = y;
    m.data[14] = z;
    return m;
  }

  static scale(x: number, y: number, z: number): Mat4 {
    const m = new Mat4();
    m.data[0] = x;
    m.data[5] = y;
    m.data[10] = z;
    m.data[15] = 1;
    return m;
  }

  static rotationX(angle: number): Mat4 {
    const m = Mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[5] = c;
    m.data[6] = s;
    m.data[9] = -s;
    m.data[10] = c;
    return m;
  }

  static rotationY(angle: number): Mat4 {
    const m = Mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[0] = c;
    m.data[2] = -s;
    m.data[8] = s;
    m.data[10] = c;
    return m;
  }

  static rotationZ(angle: number): Mat4 {
    const m = Mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[0] = c;
    m.data[1] = s;
    m.data[4] = -s;
    m.data[5] = c;
    return m;
  }

  static rotationAxis(axis: Vec3, angle: number): Mat4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const n = axis.normalize();
    const x = n.x, y = n.y, z = n.z;

    const m = new Mat4();
    m.data[0] = t * x * x + c;
    m.data[1] = t * x * y + s * z;
    m.data[2] = t * x * z - s * y;
    m.data[3] = 0;
    m.data[4] = t * x * y - s * z;
    m.data[5] = t * y * y + c;
    m.data[6] = t * y * z + s * x;
    m.data[7] = 0;
    m.data[8] = t * x * z + s * y;
    m.data[9] = t * y * z - s * x;
    m.data[10] = t * z * z + c;
    m.data[11] = 0;
    m.data[12] = 0;
    m.data[13] = 0;
    m.data[14] = 0;
    m.data[15] = 1;
    return m;
  }

  static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
    const m = new Mat4();
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    m.data[0] = f / aspect;
    m.data[5] = f;
    m.data[10] = (far + near) * nf;
    m.data[11] = -1;
    m.data[14] = 2 * far * near * nf;
    return m;
  }

  static orthographic(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): Mat4 {
    const m = new Mat4();
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    m.data[0] = -2 * lr;
    m.data[5] = -2 * bt;
    m.data[10] = 2 * nf;
    m.data[12] = (left + right) * lr;
    m.data[13] = (top + bottom) * bt;
    m.data[14] = (far + near) * nf;
    m.data[15] = 1;
    return m;
  }

  static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const zAxis = eye.sub(target).normalize();
    const xAxis = up.cross(zAxis).normalize();
    const yAxis = zAxis.cross(xAxis);

    const m = new Mat4();
    m.data[0] = xAxis.x;
    m.data[1] = yAxis.x;
    m.data[2] = zAxis.x;
    m.data[3] = 0;
    m.data[4] = xAxis.y;
    m.data[5] = yAxis.y;
    m.data[6] = zAxis.y;
    m.data[7] = 0;
    m.data[8] = xAxis.z;
    m.data[9] = yAxis.z;
    m.data[10] = zAxis.z;
    m.data[11] = 0;
    m.data[12] = -xAxis.dot(eye);
    m.data[13] = -yAxis.dot(eye);
    m.data[14] = -zAxis.dot(eye);
    m.data[15] = 1;
    return m;
  }

  clone(): Mat4 {
    return new Mat4(new Float32Array(this.data));
  }

  multiply(b: Mat4): Mat4 {
    const a = this.data;
    const bData = b.data;
    const result = new Mat4();
    const r = result.data;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        r[j * 4 + i] =
          a[i] * bData[j * 4] +
          a[i + 4] * bData[j * 4 + 1] +
          a[i + 8] * bData[j * 4 + 2] +
          a[i + 12] * bData[j * 4 + 3];
      }
    }
    return result;
  }

  transformPoint(v: Vec3): Vec3 {
    const d = this.data;
    const w = d[3] * v.x + d[7] * v.y + d[11] * v.z + d[15];
    return new Vec3(
      (d[0] * v.x + d[4] * v.y + d[8] * v.z + d[12]) / w,
      (d[1] * v.x + d[5] * v.y + d[9] * v.z + d[13]) / w,
      (d[2] * v.x + d[6] * v.y + d[10] * v.z + d[14]) / w
    );
  }

  transformDirection(v: Vec3): Vec3 {
    const d = this.data;
    return new Vec3(
      d[0] * v.x + d[4] * v.y + d[8] * v.z,
      d[1] * v.x + d[5] * v.y + d[9] * v.z,
      d[2] * v.x + d[6] * v.y + d[10] * v.z
    );
  }

  invert(): Mat4 | null {
    const m = this.data;
    const inv = new Float32Array(16);

    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
             m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
              m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
             m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
               m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
              m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
             m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
              m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
              m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
             m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
              m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
              m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
               m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
              m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
             m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
               m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
              m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

    let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    if (det === 0) return null;

    det = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= det;
    }
    return new Mat4(inv);
  }

  transpose(): Mat4 {
    const result = new Mat4();
    const d = this.data;
    const r = result.data;
    r[0] = d[0]; r[1] = d[4]; r[2] = d[8]; r[3] = d[12];
    r[4] = d[1]; r[5] = d[5]; r[6] = d[9]; r[7] = d[13];
    r[8] = d[2]; r[9] = d[6]; r[10] = d[10]; r[11] = d[14];
    r[12] = d[3]; r[13] = d[7]; r[14] = d[11]; r[15] = d[15];
    return result;
  }
}
