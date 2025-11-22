import { Vec3 } from '@/math/vec3';
import { Mat4 } from '@/math/mat4';
import { Renderer, RenderObject, Mesh, Geometry, Camera, OrbitController } from '@/core';
import { TreeGenerator, TreeMeshBuilder, TreeParameters, DEFAULT_TREE_PARAMS } from '@/tree';
import { ParticleSystem } from '@/effects';
import { TreeGrowthAnimator } from '@/animation';
import { FamilyTree } from '@/family';

/**
 * Main TreeD Application
 */
export class TreeDApp {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private camera: Camera;
  private orbitController: OrbitController;

  private treeGenerator: TreeGenerator;
  private treeMeshBuilder: TreeMeshBuilder;
  private growthAnimator: TreeGrowthAnimator;
  private particleSystem: ParticleSystem;
  private familyTree: FamilyTree;

  private treeMesh: Mesh | null = null;
  private groundMesh: Mesh;
  private renderObjects: RenderObject[] = [];

  private lastTime: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;
  private elapsedTime: number = 0;

  // Tree parameters for UI control
  private treeParams: TreeParameters = { ...DEFAULT_TREE_PARAMS };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize renderer
    this.renderer = new Renderer(canvas);
    const gl = this.renderer.getGL();

    // Initialize camera
    this.camera = new Camera({
      position: new Vec3(0, 6, 12),
      target: new Vec3(0, 3, 0),
      fov: Math.PI / 4,
      aspect: canvas.clientWidth / canvas.clientHeight,
    });

    this.orbitController = new OrbitController(this.camera, canvas, {
      radius: 15,
      autoRotate: true,
      autoRotateSpeed: 0.1,
    });

    // Initialize tree system
    this.treeGenerator = new TreeGenerator(this.treeParams);
    this.treeMeshBuilder = new TreeMeshBuilder(gl);
    this.growthAnimator = new TreeGrowthAnimator({ growthSpeed: 0.2 });

    // Initialize particle system (fireflies)
    this.particleSystem = new ParticleSystem(gl, {
      maxParticles: 80,
      spawnRate: 8,
      spawnArea: {
        min: new Vec3(-4, 0.5, -4),
        max: new Vec3(4, 10, 4),
      },
      particleSize: 0.06,
      color: new Vec3(0.3, 0.95, 0.5),  // Bright green glow
      lifespan: 5,
      flickerSpeed: 4,
    });

    // Initialize family tree
    this.familyTree = FamilyTree.createSampleTree();

    // Create ground plane
    this.groundMesh = Geometry.createPlane(gl, 20, 20, 10, 10);

    // Set up resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();

    // Generate initial tree
    this.regenerateTree();
  }

  /**
   * Regenerate tree with current parameters
   */
  regenerateTree(): void {
    this.treeGenerator = new TreeGenerator(this.treeParams);
    const treeStructure = this.treeGenerator.generate();

    // Bind family tree data
    this.familyTree.bindToBranches(treeStructure);

    // Build mesh (will be updated in render loop for animation)
    this.rebuildTreeMesh();
  }

  private rebuildTreeMesh(): void {
    if (this.treeMesh) {
      this.treeMesh.dispose();
    }

    const treeStructure = new TreeGenerator(this.treeParams).generate();
    this.treeMesh = this.treeMeshBuilder.buildTree(treeStructure, {
      segments: this.treeParams.segments,
      growthProgress: this.growthAnimator.getProgress(),
    });
  }

  private handleResize(): void {
    this.renderer.resize();
    this.camera.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();

    // Start tree growth after a short delay
    setTimeout(() => {
      this.growthAnimator.startGrowth();
    }, 500);
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.elapsedTime += deltaTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private update(deltaTime: number): void {
    // Update orbit controller
    this.orbitController.update(deltaTime);

    // Update growth animation
    const wasAnimating = this.growthAnimator.isAnimating();
    this.growthAnimator.update(deltaTime);

    // Rebuild tree mesh if growth changed
    if (wasAnimating || this.growthAnimator.isAnimating()) {
      this.rebuildTreeMesh();
    }

    // Update particle system
    this.particleSystem.update(deltaTime, this.elapsedTime);
  }

  private render(): void {
    // Build render objects
    this.renderObjects = [];

    // Ground
    this.renderObjects.push({
      mesh: this.groundMesh,
      modelMatrix: Mat4.translation(0, -0.01, 0),
      color: new Vec3(0.05, 0.08, 0.05),
      emissive: new Vec3(0.0, 0.1, 0.05),
      emissiveIntensity: 0.1,
    });

    // Tree
    if (this.treeMesh) {
      this.renderObjects.push({
        mesh: this.treeMesh,
        modelMatrix: Mat4.identity(),
        color: new Vec3(0.35, 0.25, 0.15),
        emissive: new Vec3(0.2, 0.8, 0.4),
        emissiveIntensity: 0.4,
      });
    }

    // Main scene render
    this.renderer.render(this.camera, this.renderObjects, this.elapsedTime);

    // Render particles on top (with additive blending)
    this.particleSystem.render(this.camera.viewProjectionMatrix, this.elapsedTime);
  }

  /**
   * Set tree growth progress (0-1)
   */
  setGrowthProgress(progress: number): void {
    this.growthAnimator.setProgress(progress);
    this.rebuildTreeMesh();
  }

  /**
   * Animate growth to a specific level
   */
  growTo(progress: number): void {
    this.growthAnimator.growTo(progress);
  }

  /**
   * Reset tree to sapling
   */
  resetGrowth(): void {
    this.growthAnimator.reset();
    this.rebuildTreeMesh();
  }

  /**
   * Update tree parameters
   */
  setTreeParams(params: Partial<TreeParameters>): void {
    this.treeParams = { ...this.treeParams, ...params };
    this.regenerateTree();
  }

  /**
   * Get current tree parameters
   */
  getTreeParams(): TreeParameters {
    return { ...this.treeParams };
  }

  /**
   * Get family tree data
   */
  getFamilyTree(): FamilyTree {
    return this.familyTree;
  }

  /**
   * Load custom family tree
   */
  loadFamilyTree(data: import('@/tree/types').FamilyTreeData): void {
    this.familyTree.loadData(data);
    this.regenerateTree();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.treeMesh?.dispose();
    this.groundMesh.dispose();
    this.particleSystem.dispose();
  }
}

// Auto-initialize when DOM is ready
let app: TreeDApp | null = null;

export function initTreeD(canvas: HTMLCanvasElement): TreeDApp {
  app = new TreeDApp(canvas);
  app.start();
  return app;
}

export function getApp(): TreeDApp | null {
  return app;
}

// Make available globally for debugging
declare global {
  interface Window {
    TreeD: {
      app: TreeDApp | null;
      init: typeof initTreeD;
    };
  }
}

if (typeof window !== 'undefined') {
  window.TreeD = {
    app: null,
    init: (canvas: HTMLCanvasElement) => {
      const instance = initTreeD(canvas);
      window.TreeD.app = instance;
      return instance;
    },
  };
}
