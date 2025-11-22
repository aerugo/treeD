import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

/**
 * Quaternion class for rotations in the TreeD engine
 */
export class Quaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  static fromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const n = axis.normalize();
    return new Quaternion(
      n.x * s,
      n.y * s,
      n.z * s,
      Math.cos(halfAngle)
    );
  }

  static fromEuler(pitch: number, yaw: number, roll: number): Quaternion {
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);

    return new Quaternion(
      sr * cp * cy - cr * sp * sy,
      cr * sp * cy + sr * cp * sy,
      cr * cp * sy - sr * sp * cy,
      cr * cp * cy + sr * sp * sy
    );
  }

  static lookRotation(forward: Vec3, up: Vec3 = Vec3.UP): Quaternion {
    const f = forward.normalize();
    const r = up.cross(f).normalize();
    const u = f.cross(r);

    const m00 = r.x, m01 = r.y, m02 = r.z;
    const m10 = u.x, m11 = u.y, m12 = u.z;
    const m20 = f.x, m21 = f.y, m22 = f.z;

    const trace = m00 + m11 + m22;
    let q: Quaternion;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      q = new Quaternion(
        (m12 - m21) * s,
        (m20 - m02) * s,
        (m01 - m10) * s,
        0.25 / s
      );
    } else if (m00 > m11 && m00 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
      q = new Quaternion(
        0.25 * s,
        (m01 + m10) / s,
        (m20 + m02) / s,
        (m12 - m21) / s
      );
    } else if (m11 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
      q = new Quaternion(
        (m01 + m10) / s,
        0.25 * s,
        (m12 + m21) / s,
        (m20 - m02) / s
      );
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
      q = new Quaternion(
        (m20 + m02) / s,
        (m12 + m21) / s,
        0.25 * s,
        (m01 - m10) / s
      );
    }
    return q.normalize();
  }

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  normalize(): Quaternion {
    const len = this.length();
    if (len === 0) return Quaternion.identity();
    return new Quaternion(
      this.x / len,
      this.y / len,
      this.z / len,
      this.w / len
    );
  }

  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }

  rotate(v: Vec3): Vec3 {
    const qv = new Quaternion(v.x, v.y, v.z, 0);
    const result = this.multiply(qv).multiply(this.conjugate());
    return new Vec3(result.x, result.y, result.z);
  }

  slerp(q: Quaternion, t: number): Quaternion {
    let dot = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;

    // If dot is negative, negate one quaternion to take shorter path
    let q2 = q;
    if (dot < 0) {
      dot = -dot;
      q2 = new Quaternion(-q.x, -q.y, -q.z, -q.w);
    }

    if (dot > 0.9995) {
      // Linear interpolation for very close quaternions
      return new Quaternion(
        this.x + t * (q2.x - this.x),
        this.y + t * (q2.y - this.y),
        this.z + t * (q2.z - this.z),
        this.w + t * (q2.w - this.w)
      ).normalize();
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return new Quaternion(
      s0 * this.x + s1 * q2.x,
      s0 * this.y + s1 * q2.y,
      s0 * this.z + s1 * q2.z,
      s0 * this.w + s1 * q2.w
    );
  }

  toMat4(): Mat4 {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const m = new Mat4();
    m.data[0] = 1 - (yy + zz);
    m.data[1] = xy + wz;
    m.data[2] = xz - wy;
    m.data[3] = 0;
    m.data[4] = xy - wz;
    m.data[5] = 1 - (xx + zz);
    m.data[6] = yz + wx;
    m.data[7] = 0;
    m.data[8] = xz + wy;
    m.data[9] = yz - wx;
    m.data[10] = 1 - (xx + yy);
    m.data[11] = 0;
    m.data[12] = 0;
    m.data[13] = 0;
    m.data[14] = 0;
    m.data[15] = 1;
    return m;
  }

  toEuler(): Vec3 {
    const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
    const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (this.w * this.y - this.z * this.x);
    const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

    const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
    const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return new Vec3(pitch, yaw, roll);
  }
}
