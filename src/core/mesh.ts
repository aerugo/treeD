import { Vec3 } from '@/math/vec3';

export interface MeshData {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  colors?: Float32Array;
  indices?: Uint16Array | Uint32Array;
}

/**
 * Mesh class for storing and rendering geometry
 */
export class Mesh {
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private ebo: WebGLBuffer | null = null;
  private vertexCount: number;
  private indexCount: number = 0;
  private hasIndices: boolean = false;

  constructor(
    private gl: WebGL2RenderingContext,
    data: MeshData
  ) {
    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;

    gl.bindVertexArray(this.vao);

    // Calculate stride and offsets
    const hasNormals = !!data.normals;
    const hasUVs = !!data.uvs;
    const hasColors = !!data.colors;

    const positionSize = 3;
    const normalSize = hasNormals ? 3 : 0;
    const uvSize = hasUVs ? 2 : 0;
    const colorSize = hasColors ? 4 : 0;
    const stride = (positionSize + normalSize + uvSize + colorSize) * 4; // 4 bytes per float

    this.vertexCount = data.positions.length / 3;

    // Interleave vertex data
    const interleavedData = new Float32Array(
      this.vertexCount * (positionSize + normalSize + uvSize + colorSize)
    );

    for (let i = 0; i < this.vertexCount; i++) {
      let offset = i * (positionSize + normalSize + uvSize + colorSize);

      // Position
      interleavedData[offset++] = data.positions[i * 3];
      interleavedData[offset++] = data.positions[i * 3 + 1];
      interleavedData[offset++] = data.positions[i * 3 + 2];

      // Normal
      if (hasNormals) {
        interleavedData[offset++] = data.normals![i * 3];
        interleavedData[offset++] = data.normals![i * 3 + 1];
        interleavedData[offset++] = data.normals![i * 3 + 2];
      }

      // UV
      if (hasUVs) {
        interleavedData[offset++] = data.uvs![i * 2];
        interleavedData[offset++] = data.uvs![i * 2 + 1];
      }

      // Color
      if (hasColors) {
        interleavedData[offset++] = data.colors![i * 4];
        interleavedData[offset++] = data.colors![i * 4 + 1];
        interleavedData[offset++] = data.colors![i * 4 + 2];
        interleavedData[offset++] = data.colors![i * 4 + 3];
      }
    }

    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.STATIC_DRAW);

    // Set up vertex attributes
    let attributeOffset = 0;

    // Position (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, attributeOffset);
    attributeOffset += 3 * 4;

    // Normal (location 1)
    if (hasNormals) {
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, attributeOffset);
      attributeOffset += 3 * 4;
    }

    // UV (location 2)
    if (hasUVs) {
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, attributeOffset);
      attributeOffset += 2 * 4;
    }

    // Color (location 3)
    if (hasColors) {
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, attributeOffset);
    }

    // Index buffer
    if (data.indices) {
      this.hasIndices = true;
      this.indexCount = data.indices.length;
      this.ebo = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    }

    gl.bindVertexArray(null);
  }

  bind(): void {
    this.gl.bindVertexArray(this.vao);
  }

  unbind(): void {
    this.gl.bindVertexArray(null);
  }

  draw(mode: number = this.gl.TRIANGLES): void {
    this.bind();
    if (this.hasIndices) {
      this.gl.drawElements(mode, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
    } else {
      this.gl.drawArrays(mode, 0, this.vertexCount);
    }
  }

  dispose(): void {
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.vbo);
    if (this.ebo) {
      this.gl.deleteBuffer(this.ebo);
    }
  }
}

/**
 * Geometry generators
 */
export const Geometry = {
  /**
   * Creates a cylinder/cone mesh
   */
  createCylinder(
    gl: WebGL2RenderingContext,
    radiusBottom: number,
    radiusTop: number,
    height: number,
    segments: number = 8
  ): Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    // Generate vertices for the sides
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      // Bottom vertex
      positions.push(radiusBottom * cosTheta, 0, radiusBottom * sinTheta);
      // Top vertex
      positions.push(radiusTop * cosTheta, height, radiusTop * sinTheta);

      // Calculate normal for the side
      const dr = radiusBottom - radiusTop;
      const normalY = dr / Math.sqrt(dr * dr + height * height);
      const normalXZ = height / Math.sqrt(dr * dr + height * height);

      normals.push(normalXZ * cosTheta, normalY, normalXZ * sinTheta);
      normals.push(normalXZ * cosTheta, normalY, normalXZ * sinTheta);
    }

    // Generate indices for the sides
    for (let i = 0; i < segments; i++) {
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = i * 2 + 2;
      const i3 = i * 2 + 3;

      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }

    // Add bottom cap if radiusBottom > 0
    if (radiusBottom > 0) {
      const bottomCenterIndex = positions.length / 3;
      positions.push(0, 0, 0);
      normals.push(0, -1, 0);

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(radiusBottom * Math.cos(theta), 0, radiusBottom * Math.sin(theta));
        normals.push(0, -1, 0);
      }

      for (let i = 0; i < segments; i++) {
        indices.push(
          bottomCenterIndex,
          bottomCenterIndex + i + 2,
          bottomCenterIndex + i + 1
        );
      }
    }

    // Add top cap if radiusTop > 0
    if (radiusTop > 0) {
      const topCenterIndex = positions.length / 3;
      positions.push(0, height, 0);
      normals.push(0, 1, 0);

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(radiusTop * Math.cos(theta), height, radiusTop * Math.sin(theta));
        normals.push(0, 1, 0);
      }

      for (let i = 0; i < segments; i++) {
        indices.push(
          topCenterIndex,
          topCenterIndex + i + 1,
          topCenterIndex + i + 2
        );
      }
    }

    return new Mesh(gl, {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: new Uint16Array(indices),
    });
  },

  /**
   * Creates a sphere mesh
   */
  createSphere(
    gl: WebGL2RenderingContext,
    radius: number,
    widthSegments: number = 16,
    heightSegments: number = 12
  ): Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const phi = v * Math.PI;

      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const theta = u * Math.PI * 2;

        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const nx = sinPhi * cosTheta;
        const ny = cosPhi;
        const nz = sinPhi * sinTheta;

        positions.push(radius * nx, radius * ny, radius * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, v);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const i0 = y * (widthSegments + 1) + x;
        const i1 = i0 + 1;
        const i2 = i0 + widthSegments + 1;
        const i3 = i2 + 1;

        if (y !== 0) {
          indices.push(i0, i2, i1);
        }
        if (y !== heightSegments - 1) {
          indices.push(i1, i2, i3);
        }
      }
    }

    return new Mesh(gl, {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
    });
  },

  /**
   * Creates a plane mesh
   */
  createPlane(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    widthSegments: number = 1,
    heightSegments: number = 1
  ): Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        positions.push(
          u * width - halfWidth,
          0,
          v * height - halfHeight
        );
        normals.push(0, 1, 0);
        uvs.push(u, v);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const i0 = y * (widthSegments + 1) + x;
        const i1 = i0 + 1;
        const i2 = i0 + widthSegments + 1;
        const i3 = i2 + 1;

        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    return new Mesh(gl, {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
    });
  },
};
