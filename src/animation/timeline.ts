import { MathUtils } from '@/math';

export type EasingFunction = (t: number) => number;

/**
 * Common easing functions
 */
export const Easing = {
  linear: (t: number) => t,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),

  easeInElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },

  easeOutBack: (t: number) => {
    const c = 1.70158;
    return 1 + (--t) * t * ((c + 1) * t + c);
  },
};

interface Tween<T> {
  id: string;
  target: T;
  property: keyof T;
  startValue: number;
  endValue: number;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

/**
 * Animation timeline for managing tweens
 */
export class Timeline {
  private tweens: Map<string, Tween<unknown>> = new Map();
  private currentTime: number = 0;
  private tweenIdCounter: number = 0;

  /**
   * Animate a property on an object
   */
  animate<T extends Record<string, unknown>>(
    target: T,
    property: keyof T,
    endValue: number,
    duration: number,
    options: {
      easing?: EasingFunction;
      delay?: number;
      onUpdate?: (value: number) => void;
      onComplete?: () => void;
    } = {}
  ): string {
    const id = `tween_${this.tweenIdCounter++}`;
    const startValue = target[property] as number;

    const tween: Tween<T> = {
      id,
      target,
      property,
      startValue,
      endValue,
      startTime: this.currentTime + (options.delay ?? 0),
      duration,
      easing: options.easing ?? Easing.easeOutCubic,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
    };

    this.tweens.set(id, tween as Tween<unknown>);
    return id;
  }

  /**
   * Update all active tweens
   */
  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    for (const [id, tween] of this.tweens) {
      if (this.currentTime < tween.startTime) continue;

      const elapsed = this.currentTime - tween.startTime;
      const progress = Math.min(elapsed / tween.duration, 1);
      const easedProgress = tween.easing(progress);

      const value = MathUtils.lerp(tween.startValue, tween.endValue, easedProgress);

      // Type assertion since we know target has this property
      (tween.target as Record<string, unknown>)[tween.property as string] = value;

      tween.onUpdate?.(value);

      if (progress >= 1) {
        tween.onComplete?.();
        this.tweens.delete(id);
      }
    }
  }

  /**
   * Cancel a specific tween
   */
  cancel(id: string): void {
    this.tweens.delete(id);
  }

  /**
   * Cancel all tweens
   */
  cancelAll(): void {
    this.tweens.clear();
  }

  /**
   * Check if any tweens are active
   */
  isAnimating(): boolean {
    return this.tweens.size > 0;
  }

  /**
   * Get current time
   */
  getTime(): number {
    return this.currentTime;
  }

  /**
   * Reset timeline
   */
  reset(): void {
    this.tweens.clear();
    this.currentTime = 0;
  }
}

/**
 * Tree growth animation controller
 */
export class TreeGrowthAnimator {
  private growthProgress: number = 0;
  private targetProgress: number = 0;
  private growthSpeed: number;
  private isGrowing: boolean = false;

  constructor(options: { growthSpeed?: number } = {}) {
    this.growthSpeed = options.growthSpeed ?? 0.15;
  }

  /**
   * Start growing the tree
   */
  startGrowth(): void {
    this.targetProgress = 1;
    this.isGrowing = true;
  }

  /**
   * Reset tree to sapling
   */
  reset(): void {
    this.growthProgress = 0;
    this.targetProgress = 0;
    this.isGrowing = false;
  }

  /**
   * Set growth progress directly (0-1)
   */
  setProgress(progress: number): void {
    this.growthProgress = MathUtils.clamp(progress, 0, 1);
    this.targetProgress = this.growthProgress;
  }

  /**
   * Grow to a specific level (0-1)
   */
  growTo(progress: number): void {
    this.targetProgress = MathUtils.clamp(progress, 0, 1);
    this.isGrowing = true;
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    if (!this.isGrowing) return;

    const diff = this.targetProgress - this.growthProgress;
    if (Math.abs(diff) < 0.001) {
      this.growthProgress = this.targetProgress;
      this.isGrowing = false;
      return;
    }

    // Smooth approach to target
    this.growthProgress += diff * this.growthSpeed * deltaTime * 10;
  }

  /**
   * Get current growth progress (0-1)
   */
  getProgress(): number {
    return this.growthProgress;
  }

  /**
   * Check if currently animating
   */
  isAnimating(): boolean {
    return this.isGrowing;
  }
}
