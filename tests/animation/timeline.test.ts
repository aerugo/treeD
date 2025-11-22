import { describe, it, expect, vi } from 'vitest';
import { Timeline, TreeGrowthAnimator, Easing } from '@/animation/timeline';

describe('Timeline', () => {
  describe('animate', () => {
    it('animates a property over time', () => {
      const timeline = new Timeline();
      const target = { value: 0 };

      timeline.animate(target, 'value', 100, 1);

      // Update halfway
      timeline.update(0.5);
      expect(target.value).toBeGreaterThan(0);
      expect(target.value).toBeLessThan(100);

      // Update to completion
      timeline.update(0.5);
      expect(target.value).toBe(100);
    });

    it('uses easing function', () => {
      const timeline = new Timeline();
      const target = { value: 0 };

      timeline.animate(target, 'value', 100, 1, {
        easing: Easing.linear,
      });

      timeline.update(0.5);
      expect(target.value).toBeCloseTo(50, 0);
    });

    it('calls onUpdate callback', () => {
      const timeline = new Timeline();
      const target = { value: 0 };
      const onUpdate = vi.fn();

      timeline.animate(target, 'value', 100, 1, { onUpdate });

      timeline.update(0.5);
      expect(onUpdate).toHaveBeenCalled();
    });

    it('calls onComplete when finished', () => {
      const timeline = new Timeline();
      const target = { value: 0 };
      const onComplete = vi.fn();

      timeline.animate(target, 'value', 100, 1, { onComplete });

      timeline.update(1.5); // Past completion
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('respects delay', () => {
      const timeline = new Timeline();
      const target = { value: 0 };

      timeline.animate(target, 'value', 100, 1, { delay: 0.5 });

      timeline.update(0.25);
      expect(target.value).toBe(0); // Still in delay

      timeline.update(0.5);
      expect(target.value).toBeGreaterThan(0); // Started animating
    });
  });

  describe('cancel', () => {
    it('cancels a specific tween', () => {
      const timeline = new Timeline();
      const target = { value: 0 };

      const id = timeline.animate(target, 'value', 100, 1);
      timeline.cancel(id);

      timeline.update(1);
      expect(target.value).toBe(0); // Should not have changed
    });
  });

  describe('isAnimating', () => {
    it('returns true when tweens are active', () => {
      const timeline = new Timeline();
      const target = { value: 0 };

      expect(timeline.isAnimating()).toBe(false);

      timeline.animate(target, 'value', 100, 1);
      expect(timeline.isAnimating()).toBe(true);

      timeline.update(2);
      expect(timeline.isAnimating()).toBe(false);
    });
  });
});

describe('Easing', () => {
  it('linear returns input unchanged', () => {
    expect(Easing.linear(0)).toBe(0);
    expect(Easing.linear(0.5)).toBe(0.5);
    expect(Easing.linear(1)).toBe(1);
  });

  it('easeInQuad starts slow', () => {
    expect(Easing.easeInQuad(0.5)).toBeLessThan(0.5);
  });

  it('easeOutQuad ends slow', () => {
    expect(Easing.easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });

  it('easeOutElastic has bounce effect', () => {
    // Elastic should have values > 1 and eventually settle at 1
    // Test at smaller values where overshoot occurs
    const values = [0.1, 0.2, 0.3, 0.4, 0.5].map(Easing.easeOutElastic);
    // Should have some variation showing the elastic bounce
    const max = Math.max(...values);
    const min = Math.min(...values);
    expect(max - min).toBeGreaterThan(0.1); // There should be bounce variation
    expect(Easing.easeOutElastic(1)).toBeCloseTo(1, 5); // Should end at 1
  });
});

describe('TreeGrowthAnimator', () => {
  describe('growth animation', () => {
    it('starts at 0 progress', () => {
      const animator = new TreeGrowthAnimator();
      expect(animator.getProgress()).toBe(0);
    });

    it('animates to full growth', () => {
      const animator = new TreeGrowthAnimator({ growthSpeed: 1 });
      animator.startGrowth();

      // Simulate several update frames
      for (let i = 0; i < 20; i++) {
        animator.update(0.1);
      }

      expect(animator.getProgress()).toBeCloseTo(1, 1);
    });

    it('can grow to specific level', () => {
      const animator = new TreeGrowthAnimator({ growthSpeed: 1 });
      animator.growTo(0.5);

      for (let i = 0; i < 20; i++) {
        animator.update(0.1);
      }

      expect(animator.getProgress()).toBeCloseTo(0.5, 1);
    });

    it('can reset', () => {
      const animator = new TreeGrowthAnimator();
      animator.setProgress(0.8);
      animator.reset();
      expect(animator.getProgress()).toBe(0);
    });

    it('reports animation state', () => {
      const animator = new TreeGrowthAnimator();
      expect(animator.isAnimating()).toBe(false);

      animator.startGrowth();
      expect(animator.isAnimating()).toBe(true);
    });
  });
});
