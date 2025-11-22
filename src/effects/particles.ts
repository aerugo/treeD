import { Vec3 } from '@/math/vec3';
import { MathUtils } from '@/math';
import { Shader } from '@/core/shader';

interface Particle {
  position: Vec3;
  velocity: Vec3;
  life: number;
  maxLife: number;
  size: number;
  brightness: number;
  phase: number;  // For flickering
}

export interface ParticleSystemOptions {
  maxParticles: number;
  spawnRate: number;       // Particles per second
  spawnArea: { min: Vec3; max: Vec3 };
  particleSize: number;
  particleSizeVariance: number;
  speed: number;
  speedVariance: number;
  lifespan: number;
  lifespanVariance: number;
  color: Vec3;
  flickerSpeed: number;
}

const DEFAULT_OPTIONS: ParticleSystemOptions = {
  maxParticles: 100,
  spawnRate: 10,
  spawnArea: {
    min: new Vec3(-3, 0, -3),
    max: new Vec3(3, 8, 3),
  },
  particleSize: 0.08,
  particleSizeVariance: 0.03,
  speed: 0.3,
  speedVariance: 0.2,
  lifespan: 4,
  lifespanVariance: 2,
  color: new Vec3(0.4, 0.9, 0.5),  // Soft green glow
  flickerSpeed: 5,
};

/**
 * Firefly particle system
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private options: ParticleSystemOptions;
  private shader: Shader;
  private vao: WebGLVertexArrayObject;
  private positionBuffer: WebGLBuffer;
  private sizeBuffer: WebGLBuffer;
  private brightnessBuffer: WebGLBuffer;
  private spawnAccumulator: number = 0;

  constructor(
    private gl: WebGL2RenderingContext,
    options: Partial<ParticleSystemOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.shader = this.createShader();
    this.vao = gl.createVertexArray()!;
    this.positionBuffer = gl.createBuffer()!;
    this.sizeBuffer = gl.createBuffer()!;
    this.brightnessBuffer = gl.createBuffer()!;

    this.setupBuffers();
  }

  private createShader(): Shader {
    const vertexSource = `#version 300 es
      precision highp float;

      layout(location = 0) in vec3 aPosition;
      layout(location = 1) in float aSize;
      layout(location = 2) in float aBrightness;

      uniform mat4 uViewProjection;
      uniform float uTime;

      out float vBrightness;

      void main() {
        vBrightness = aBrightness;

        vec4 viewPos = uViewProjection * vec4(aPosition, 1.0);
        gl_Position = viewPos;
        gl_PointSize = aSize * 500.0 / viewPos.w;
      }
    `;

    const fragmentSource = `#version 300 es
      precision highp float;

      in float vBrightness;

      uniform vec3 uColor;
      uniform float uTime;

      out vec4 fragColor;

      void main() {
        // Create soft circular particle
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);

        if (dist > 0.5) discard;

        // Soft glow falloff
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha = pow(alpha, 1.5);

        // Core brightness
        float core = 1.0 - smoothstep(0.0, 0.15, dist);

        vec3 color = uColor * vBrightness;
        color += vec3(1.0) * core * vBrightness * 0.5;

        fragColor = vec4(color, alpha * vBrightness);
      }
    `;

    return new Shader(this.gl, vertexSource, fragmentSource);
  }

  private setupBuffers(): void {
    const gl = this.gl;

    gl.bindVertexArray(this.vao);

    // Position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 3 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // Size buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

    // Brightness buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.brightnessBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.options.maxParticles * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  private spawnParticle(): void {
    if (this.particles.length >= this.options.maxParticles) return;

    const { spawnArea, speed, speedVariance, lifespan, lifespanVariance } = this.options;

    const particle: Particle = {
      position: new Vec3(
        MathUtils.randomRange(spawnArea.min.x, spawnArea.max.x),
        MathUtils.randomRange(spawnArea.min.y, spawnArea.max.y),
        MathUtils.randomRange(spawnArea.min.z, spawnArea.max.z)
      ),
      velocity: new Vec3(
        MathUtils.randomRange(-0.5, 0.5),
        MathUtils.randomRange(0.2, 1),  // Mostly upward
        MathUtils.randomRange(-0.5, 0.5)
      ).normalize().scale(speed + MathUtils.randomRange(-speedVariance, speedVariance)),
      life: lifespan + MathUtils.randomRange(-lifespanVariance, lifespanVariance),
      maxLife: lifespan + MathUtils.randomRange(-lifespanVariance, lifespanVariance),
      size: this.options.particleSize + MathUtils.randomRange(-this.options.particleSizeVariance, this.options.particleSizeVariance),
      brightness: 1,
      phase: Math.random() * Math.PI * 2,
    };

    particle.maxLife = particle.life;
    this.particles.push(particle);
  }

  update(deltaTime: number, time: number): void {
    const { spawnRate, flickerSpeed, spawnArea } = this.options;

    // Spawn new particles
    this.spawnAccumulator += deltaTime * spawnRate;
    while (this.spawnAccumulator >= 1) {
      this.spawnParticle();
      this.spawnAccumulator -= 1;
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update life
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position with gentle wandering
      const wander = new Vec3(
        Math.sin(time * 2 + p.phase) * 0.1,
        0,
        Math.cos(time * 2.5 + p.phase) * 0.1
      );
      p.position = p.position.add(p.velocity.add(wander).scale(deltaTime));

      // Wrap around spawn area
      if (p.position.y > spawnArea.max.y) {
        p.position = new Vec3(p.position.x, spawnArea.min.y, p.position.z);
      }

      // Calculate brightness with flickering
      const lifeRatio = p.life / p.maxLife;
      const fadeIn = MathUtils.smoothstep(0, 0.1, 1 - lifeRatio);
      const fadeOut = MathUtils.smoothstep(0, 0.2, lifeRatio);
      const flicker = 0.7 + 0.3 * Math.sin(time * flickerSpeed + p.phase);
      p.brightness = fadeIn * fadeOut * flicker;
    }
  }

  render(viewProjectionMatrix: import('@/math/mat4').Mat4, time: number): void {
    if (this.particles.length === 0) return;

    const gl = this.gl;
    const count = this.particles.length;

    // Prepare data arrays
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightnesses = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      sizes[i] = p.size;
      brightnesses[i] = p.brightness;
    }

    // Update buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizes);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.brightnessBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, brightnesses);

    // Render
    this.shader.use();
    this.shader.setUniformMat4('uViewProjection', viewProjectionMatrix);
    this.shader.setUniformVec3('uColor', this.options.color);
    this.shader.setUniform1f('uTime', time);

    // Additive blending for glow
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, count);

    // Restore state
    gl.depthMask(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.positionBuffer);
    this.gl.deleteBuffer(this.sizeBuffer);
    this.gl.deleteBuffer(this.brightnessBuffer);
    this.gl.deleteVertexArray(this.vao);
    this.shader.dispose();
  }
}
