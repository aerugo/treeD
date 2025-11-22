import { Mat4 } from '@/math/mat4';
import { Vec3 } from '@/math/vec3';

/**
 * WebGL Shader Program wrapper
 */
export class Shader {
  private program: WebGLProgram;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();
  private attributeLocations: Map<string, number> = new Map();

  constructor(
    private gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ) {
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(this.program);
      gl.deleteProgram(this.program);
      throw new Error(`Shader program link error: ${error}`);
    }

    // Clean up individual shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      const shaderType = type === this.gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      throw new Error(`${shaderType} shader compile error: ${error}`);
    }

    return shader;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getUniformLocation(name: string): WebGLUniformLocation | null {
    if (this.uniformLocations.has(name)) {
      return this.uniformLocations.get(name)!;
    }
    const location = this.gl.getUniformLocation(this.program, name);
    if (location) {
      this.uniformLocations.set(name, location);
    }
    return location;
  }

  getAttributeLocation(name: string): number {
    if (this.attributeLocations.has(name)) {
      return this.attributeLocations.get(name)!;
    }
    const location = this.gl.getAttribLocation(this.program, name);
    this.attributeLocations.set(name, location);
    return location;
  }

  setUniform1f(name: string, value: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform1f(location, value);
  }

  setUniform1i(name: string, value: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform1i(location, value);
  }

  setUniform2f(name: string, x: number, y: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform2f(location, x, y);
  }

  setUniform3f(name: string, x: number, y: number, z: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform3f(location, x, y, z);
  }

  setUniformVec3(name: string, v: Vec3): void {
    this.setUniform3f(name, v.x, v.y, v.z);
  }

  setUniform4f(name: string, x: number, y: number, z: number, w: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform4f(location, x, y, z, w);
  }

  setUniformMat4(name: string, matrix: Mat4): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniformMatrix4fv(location, false, matrix.data);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}
