/**
 * Visual Testing Utilities for TreeD
 *
 * This module provides tools for capturing screenshots and
 * validating visual output of the 3D tree rendering.
 */

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  filename?: string;
}

/**
 * Capture the current canvas state as a data URL
 */
export function captureCanvas(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Download a canvas screenshot
 */
export function downloadScreenshot(
  canvas: HTMLCanvasElement,
  filename: string = 'treed-screenshot.png'
): void {
  const dataUrl = captureCanvas(canvas);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Create a visual diff between two images
 * Returns the percentage of pixels that differ
 */
export async function compareImages(
  imageA: string,
  imageB: string,
  threshold: number = 10
): Promise<{ diffPercent: number; diffCanvas: HTMLCanvasElement }> {
  return new Promise((resolve, reject) => {
    const imgA = new Image();
    const imgB = new Image();
    let loadedCount = 0;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const width = Math.max(imgA.width, imgB.width);
      const height = Math.max(imgA.height, imgB.height);

      const canvasA = document.createElement('canvas');
      const canvasB = document.createElement('canvas');
      const diffCanvas = document.createElement('canvas');

      canvasA.width = canvasB.width = diffCanvas.width = width;
      canvasA.height = canvasB.height = diffCanvas.height = height;

      const ctxA = canvasA.getContext('2d')!;
      const ctxB = canvasB.getContext('2d')!;
      const ctxDiff = diffCanvas.getContext('2d')!;

      ctxA.drawImage(imgA, 0, 0);
      ctxB.drawImage(imgB, 0, 0);

      const dataA = ctxA.getImageData(0, 0, width, height);
      const dataB = ctxB.getImageData(0, 0, width, height);
      const diffData = ctxDiff.createImageData(width, height);

      let diffPixels = 0;
      const totalPixels = width * height;

      for (let i = 0; i < dataA.data.length; i += 4) {
        const rDiff = Math.abs(dataA.data[i] - dataB.data[i]);
        const gDiff = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
        const bDiff = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);

        const maxDiff = Math.max(rDiff, gDiff, bDiff);

        if (maxDiff > threshold) {
          diffPixels++;
          // Mark different pixels in red
          diffData.data[i] = 255;
          diffData.data[i + 1] = 0;
          diffData.data[i + 2] = 0;
          diffData.data[i + 3] = 255;
        } else {
          // Copy original with reduced opacity
          diffData.data[i] = dataA.data[i];
          diffData.data[i + 1] = dataA.data[i + 1];
          diffData.data[i + 2] = dataA.data[i + 2];
          diffData.data[i + 3] = 100;
        }
      }

      ctxDiff.putImageData(diffData, 0, 0);

      resolve({
        diffPercent: (diffPixels / totalPixels) * 100,
        diffCanvas,
      });
    };

    imgA.onload = onLoad;
    imgB.onload = onLoad;
    imgA.onerror = reject;
    imgB.onerror = reject;

    imgA.src = imageA;
    imgB.src = imageB;
  });
}

/**
 * Generate a test report HTML page
 */
export function generateTestReport(
  results: Array<{
    name: string;
    expected?: string;
    actual: string;
    diff?: string;
    diffPercent?: number;
    passed: boolean;
  }>
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>TreeD Visual Test Report</title>
  <style>
    body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { color: #80ffb0; }
    .test { background: #252540; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .test.passed { border-left: 4px solid #4caf50; }
    .test.failed { border-left: 4px solid #f44336; }
    .images { display: flex; gap: 10px; margin-top: 10px; }
    .images img { max-width: 300px; border-radius: 4px; }
    .label { font-size: 0.8em; color: #888; }
    .status { font-weight: bold; }
    .passed .status { color: #4caf50; }
    .failed .status { color: #f44336; }
  </style>
</head>
<body>
  <h1>TreeD Visual Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  ${results.map(r => `
    <div class="test ${r.passed ? 'passed' : 'failed'}">
      <h3>${r.name} <span class="status">${r.passed ? 'PASSED' : 'FAILED'}</span></h3>
      ${r.diffPercent !== undefined ? `<p>Difference: ${r.diffPercent.toFixed(2)}%</p>` : ''}
      <div class="images">
        ${r.expected ? `<div><div class="label">Expected</div><img src="${r.expected}"></div>` : ''}
        <div><div class="label">Actual</div><img src="${r.actual}"></div>
        ${r.diff ? `<div><div class="label">Diff</div><img src="${r.diff}"></div>` : ''}
      </div>
    </div>
  `).join('')}
</body>
</html>
  `.trim();
}

/**
 * Simple visual sanity checks
 */
export function runVisualSanityChecks(canvas: HTMLCanvasElement): {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
} {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check 1: Canvas has dimensions
  const hasDimensions = canvas.width > 0 && canvas.height > 0;
  checks.push({
    name: 'Canvas has dimensions',
    passed: hasDimensions,
    message: hasDimensions
      ? `${canvas.width}x${canvas.height}`
      : 'Canvas has zero dimensions',
  });

  // Check 2: Canvas is not completely black/empty
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let nonBlackPixels = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 5 || imageData.data[i + 1] > 5 || imageData.data[i + 2] > 5) {
        nonBlackPixels++;
      }
    }
    const percentNonBlack = (nonBlackPixels / (canvas.width * canvas.height)) * 100;
    const hasContent = percentNonBlack > 1;
    checks.push({
      name: 'Canvas has visual content',
      passed: hasContent,
      message: hasContent
        ? `${percentNonBlack.toFixed(1)}% non-black pixels`
        : 'Canvas appears empty',
    });
  }

  return {
    passed: checks.every(c => c.passed),
    checks,
  };
}
