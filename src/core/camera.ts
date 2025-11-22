import { Vec3 } from '@/math/vec3';
import { Mat4 } from '@/math/mat4';
import { MathUtils } from '@/math';

/**
 * Camera class with orbit controls
 */
export class Camera {
  private _position: Vec3;
  private _target: Vec3;
  private _up: Vec3;
  private _fov: number;
  private _aspect: number;
  private _near: number;
  private _far: number;

  private _viewMatrix: Mat4 = Mat4.identity();
  private _projectionMatrix: Mat4 = Mat4.identity();
  private _viewProjectionMatrix: Mat4 = Mat4.identity();
  private _dirty: boolean = true;

  constructor(options: {
    position?: Vec3;
    target?: Vec3;
    up?: Vec3;
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
  } = {}) {
    this._position = options.position ?? new Vec3(0, 5, 10);
    this._target = options.target ?? new Vec3(0, 0, 0);
    this._up = options.up ?? Vec3.UP;
    this._fov = options.fov ?? MathUtils.degToRad(60);
    this._aspect = options.aspect ?? 16 / 9;
    this._near = options.near ?? 0.1;
    this._far = options.far ?? 1000;
  }

  get position(): Vec3 {
    return this._position;
  }

  set position(v: Vec3) {
    this._position = v;
    this._dirty = true;
  }

  get target(): Vec3 {
    return this._target;
  }

  set target(v: Vec3) {
    this._target = v;
    this._dirty = true;
  }

  get fov(): number {
    return this._fov;
  }

  set fov(v: number) {
    this._fov = v;
    this._dirty = true;
  }

  get aspect(): number {
    return this._aspect;
  }

  set aspect(v: number) {
    this._aspect = v;
    this._dirty = true;
  }

  get viewMatrix(): Mat4 {
    this.updateMatrices();
    return this._viewMatrix;
  }

  get projectionMatrix(): Mat4 {
    this.updateMatrices();
    return this._projectionMatrix;
  }

  get viewProjectionMatrix(): Mat4 {
    this.updateMatrices();
    return this._viewProjectionMatrix;
  }

  private updateMatrices(): void {
    if (!this._dirty) return;

    this._viewMatrix = Mat4.lookAt(this._position, this._target, this._up);
    this._projectionMatrix = Mat4.perspective(
      this._fov,
      this._aspect,
      this._near,
      this._far
    );
    this._viewProjectionMatrix = this._projectionMatrix.multiply(this._viewMatrix);
    this._dirty = false;
  }

  getForward(): Vec3 {
    return this._target.sub(this._position).normalize();
  }

  getRight(): Vec3 {
    return this.getForward().cross(this._up).normalize();
  }

  resize(width: number, height: number): void {
    this._aspect = width / height;
    this._dirty = true;
  }
}

/**
 * Orbit camera controller
 */
export class OrbitController {
  private theta: number = 0; // Horizontal angle
  private phi: number = Math.PI / 4; // Vertical angle
  private radius: number;
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  private minRadius: number = 1;
  private maxRadius: number = 100;
  private minPhi: number = 0.1;
  private maxPhi: number = Math.PI - 0.1;
  private rotationSpeed: number = 0.005;
  private zoomSpeed: number = 0.1;
  private autoRotate: boolean = false;
  private autoRotateSpeed: number = 0.5;

  constructor(
    private camera: Camera,
    private canvas: HTMLCanvasElement,
    options: {
      radius?: number;
      autoRotate?: boolean;
      autoRotateSpeed?: number;
    } = {}
  ) {
    this.radius = options.radius ?? 15;
    this.autoRotate = options.autoRotate ?? false;
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.5;

    this.setupEventListeners();
    this.updateCamera();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;

    this.theta -= deltaX * this.rotationSpeed;
    this.phi = MathUtils.clamp(
      this.phi + deltaY * this.rotationSpeed,
      this.minPhi,
      this.maxPhi
    );

    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.updateCamera();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.radius = MathUtils.clamp(
      this.radius + e.deltaY * this.zoomSpeed,
      this.minRadius,
      this.maxRadius
    );
    this.updateCamera();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.lastX;
    const deltaY = e.touches[0].clientY - this.lastY;

    this.theta -= deltaX * this.rotationSpeed;
    this.phi = MathUtils.clamp(
      this.phi + deltaY * this.rotationSpeed,
      this.minPhi,
      this.maxPhi
    );

    this.lastX = e.touches[0].clientX;
    this.lastY = e.touches[0].clientY;
    this.updateCamera();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private updateCamera(): void {
    const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.radius * Math.cos(this.phi);
    const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);

    this.camera.position = this.camera.target.add(new Vec3(x, y, z));
  }

  update(deltaTime: number): void {
    if (this.autoRotate && !this.isDragging) {
      this.theta += this.autoRotateSpeed * deltaTime;
      this.updateCamera();
    }
  }

  setRadius(radius: number): void {
    this.radius = MathUtils.clamp(radius, this.minRadius, this.maxRadius);
    this.updateCamera();
  }

  setTarget(target: Vec3): void {
    this.camera.target = target;
    this.updateCamera();
  }
}
