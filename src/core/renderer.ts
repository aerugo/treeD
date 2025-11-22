import { Camera } from './camera';
import { Shader } from './shader';
import { Mesh } from './mesh';
import { Mat4 } from '@/math/mat4';
import { Vec3 } from '@/math/vec3';

export interface RenderObject {
  mesh: Mesh;
  modelMatrix: Mat4;
  color?: Vec3;
  emissive?: Vec3;
  emissiveIntensity?: number;
}

/**
 * WebGL2 Renderer for the TreeD engine
 */
export class Renderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private defaultShader!: Shader;
  private postProcessShader!: Shader;
  private bloomShader!: Shader;

  // Framebuffers for post-processing
  private sceneFBO: WebGLFramebuffer | null = null;
  private sceneTexture: WebGLTexture | null = null;
  private brightTexture: WebGLTexture | null = null;
  private bloomFBO: WebGLFramebuffer | null = null;
  private bloomTexture: WebGLTexture | null = null;
  private quadVAO: WebGLVertexArrayObject | null = null;

  private width: number = 0;
  private height: number = 0;
  private clearColor: [number, number, number, number] = [0.02, 0.02, 0.05, 1];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;
    this.initShaders();
    this.initPostProcessing();
    this.resize();

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Backface culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  private initShaders(): void {
    // Main scene shader with bioluminescent support
    const vertexShader = `#version 300 es
      precision highp float;

      layout(location = 0) in vec3 aPosition;
      layout(location = 1) in vec3 aNormal;
      layout(location = 2) in vec2 aUV;
      layout(location = 3) in vec4 aColor;

      uniform mat4 uModelMatrix;
      uniform mat4 uViewProjection;
      uniform mat3 uNormalMatrix;

      out vec3 vWorldPos;
      out vec3 vNormal;
      out vec2 vUV;
      out vec4 vColor;

      void main() {
        vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(uNormalMatrix * aNormal);
        vUV = aUV;
        vColor = aColor;
        gl_Position = uViewProjection * worldPos;
      }
    `;

    const fragmentShader = `#version 300 es
      precision highp float;

      in vec3 vWorldPos;
      in vec3 vNormal;
      in vec2 vUV;
      in vec4 vColor;

      uniform vec3 uCameraPos;
      uniform vec3 uColor;
      uniform vec3 uEmissive;
      uniform float uEmissiveIntensity;
      uniform float uTime;

      out vec4 fragColor;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(uCameraPos - vWorldPos);

        // Simple ambient + diffuse lighting
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 ambient = vec3(0.2);
        vec3 diffuse = diff * vec3(0.7);

        // Rim lighting for ethereal effect
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(rim, 2.5);
        vec3 rimColor = rim * uEmissive * 0.6;

        // Pulsing glow
        float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + vWorldPos.y * 0.5);
        vec3 emissiveGlow = uEmissive * uEmissiveIntensity * pulse;

        vec3 finalColor = uColor * (ambient + diffuse) + emissiveGlow + rimColor;

        // Simple tone mapping
        finalColor = finalColor / (finalColor + vec3(1.0));
        // Gamma correction
        finalColor = pow(finalColor, vec3(1.0 / 2.2));

        fragColor = vec4(finalColor, 1.0);
      }
    `;

    this.defaultShader = new Shader(this.gl, vertexShader, fragmentShader);

    // Post-processing shader
    const postVertexShader = `#version 300 es
      precision highp float;

      layout(location = 0) in vec2 aPosition;
      layout(location = 1) in vec2 aUV;

      out vec2 vUV;

      void main() {
        vUV = aUV;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const postFragmentShader = `#version 300 es
      precision highp float;

      in vec2 vUV;

      uniform sampler2D uScene;
      uniform sampler2D uBloom;
      uniform float uBloomIntensity;

      out vec4 fragColor;

      void main() {
        vec3 scene = texture(uScene, vUV).rgb;
        vec3 bloom = texture(uBloom, vUV).rgb;

        vec3 final = scene + bloom * uBloomIntensity;

        // Tone mapping
        final = final / (final + vec3(1.0));

        // Gamma correction
        final = pow(final, vec3(1.0 / 2.2));

        fragColor = vec4(final, 1.0);
      }
    `;

    this.postProcessShader = new Shader(this.gl, postVertexShader, postFragmentShader);

    // Bloom blur shader
    const bloomFragmentShader = `#version 300 es
      precision highp float;

      in vec2 vUV;

      uniform sampler2D uTexture;
      uniform vec2 uDirection;
      uniform vec2 uResolution;

      out vec4 fragColor;

      void main() {
        vec2 texelSize = 1.0 / uResolution;
        vec3 result = vec3(0.0);

        // 9-tap Gaussian blur
        float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

        result += texture(uTexture, vUV).rgb * weights[0];

        for (int i = 1; i < 5; i++) {
          vec2 offset = uDirection * texelSize * float(i) * 2.0;
          result += texture(uTexture, vUV + offset).rgb * weights[i];
          result += texture(uTexture, vUV - offset).rgb * weights[i];
        }

        fragColor = vec4(result, 1.0);
      }
    `;

    this.bloomShader = new Shader(this.gl, postVertexShader, bloomFragmentShader);
  }

  private initPostProcessing(): void {
    const gl = this.gl;

    // Create fullscreen quad
    const quadVertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1, -1, 0, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1,
    ]);

    this.quadVAO = gl.createVertexArray()!;
    const quadVBO = gl.createBuffer()!;

    gl.bindVertexArray(this.quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  private createFramebuffer(width: number, height: number, numTextures: number = 1): {
    fbo: WebGLFramebuffer;
    textures: WebGLTexture[];
  } {
    const gl = this.gl;
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const textures: WebGLTexture[] = [];
    const attachments: number[] = [];

    for (let i = 0; i < numTextures; i++) {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
      textures.push(texture);
      attachments.push(gl.COLOR_ATTACHMENT0 + i);
    }

    gl.drawBuffers(attachments);

    // Depth buffer
    const depthBuffer = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { fbo, textures };
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(this.canvas.clientWidth * dpr);
    const displayHeight = Math.floor(this.canvas.clientHeight * dpr);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.width = displayWidth;
      this.height = displayHeight;
      this.gl.viewport(0, 0, displayWidth, displayHeight);

      // Recreate framebuffers
      const scene = this.createFramebuffer(displayWidth, displayHeight, 2);
      this.sceneFBO = scene.fbo;
      this.sceneTexture = scene.textures[0];
      this.brightTexture = scene.textures[1];

      const bloom = this.createFramebuffer(displayWidth / 2, displayHeight / 2);
      this.bloomFBO = bloom.fbo;
      this.bloomTexture = bloom.textures[0];
    }
  }

  setClearColor(r: number, g: number, b: number, a: number = 1): void {
    this.clearColor = [r, g, b, a];
  }

  clear(): void {
    const gl = this.gl;
    gl.clearColor(...this.clearColor);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  render(camera: Camera, objects: RenderObject[], time: number): void {
    const gl = this.gl;

    // Direct render to screen (simplified for compatibility)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    this.clear();

    this.defaultShader.use();
    this.defaultShader.setUniformMat4('uViewProjection', camera.viewProjectionMatrix);
    this.defaultShader.setUniformVec3('uCameraPos', camera.position);
    this.defaultShader.setUniform1f('uTime', time);

    for (const obj of objects) {
      this.defaultShader.setUniformMat4('uModelMatrix', obj.modelMatrix);

      // Normal matrix (inverse transpose of model matrix 3x3)
      const normalMatrix = new Float32Array(9);
      const m = obj.modelMatrix.data;
      normalMatrix[0] = m[0]; normalMatrix[1] = m[1]; normalMatrix[2] = m[2];
      normalMatrix[3] = m[4]; normalMatrix[4] = m[5]; normalMatrix[5] = m[6];
      normalMatrix[6] = m[8]; normalMatrix[7] = m[9]; normalMatrix[8] = m[10];
      gl.uniformMatrix3fv(this.defaultShader.getUniformLocation('uNormalMatrix'), false, normalMatrix);

      this.defaultShader.setUniformVec3('uColor', obj.color ?? new Vec3(0.4, 0.3, 0.2));
      this.defaultShader.setUniformVec3('uEmissive', obj.emissive ?? new Vec3(0.2, 0.8, 0.5));
      this.defaultShader.setUniform1f('uEmissiveIntensity', obj.emissiveIntensity ?? 0.3);

      obj.mesh.draw();
    }
  }

  getGL(): WebGL2RenderingContext {
    return this.gl;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}
