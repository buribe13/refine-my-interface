/**
 * Photo Booth p5.js Sketch
 * Handles webcam capture, filters, and image capture
 */

(function () {
  "use strict";

  // Sketch state
  let p5Instance = null;
  let videoCapture = null;
  let canvasElement = null;
  let currentFilter = "normal";
  let onVideoReadyCallback = null;
  let videoElement = null;

  // Filter definitions - arranged for 3x3 grid (like classic Photo Booth)
  // Row 1: Rainbow, Vibrant, Cold Blue
  // Row 2: High Contrast, Normal, Vintage
  // Row 3: X-Ray, Neon, Black & White
  const FILTERS = [
    { id: "rainbow", name: "Rainbow" },
    { id: "vibrant", name: "Vibrant" },
    { id: "coldblue", name: "Cold Blue" },
    { id: "highcontrast", name: "High Contrast" },
    { id: "normal", name: "Normal" },
    { id: "vintage", name: "Vintage" },
    { id: "xray", name: "X-Ray" },
    { id: "neon", name: "Neon" },
    { id: "bw", name: "Black & White" },
  ];

  /**
   * Create the p5 sketch (minimal - just for video capture)
   */
  function createPhotoboothSketch(container, width, height, onVideoReady) {
    onVideoReadyCallback = onVideoReady;

    const sketch = (p) => {
      p.setup = () => {
        canvasElement = p.createCanvas(width, height);
        canvasElement.parent(container);

        // Create video capture
        videoCapture = p.createCapture(p.VIDEO, () => {
          console.log("[Sketch] Video capture started");

          // Wait for video to be ready
          const checkReady = () => {
            if (videoCapture.elt.readyState >= 2) {
              console.log("[Sketch] Video ready");
              videoElement = videoCapture.elt;
              if (onVideoReadyCallback) {
                onVideoReadyCallback(videoCapture.elt);
              }
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });

        videoCapture.size(width, height);
        videoCapture.hide();

        p.pixelDensity(1);
        p.noLoop(); // Don't need p5 draw loop - we'll render manually
      };

      p.draw = () => {
        // Not used - we render to individual filter canvases
      };
    };

    // Create p5 instance
    p5Instance = new p5(sketch);

    return p5Instance;
  }

  /**
   * Apply filter to canvas context
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {ImageData} imageData - Image data to process
   * @param {string} filter - Filter ID
   */
  function applyFilter(ctx, imageData, filter) {
    if (filter === "normal") {
      ctx.putImageData(imageData, 0, 0);
      return;
    }

    const pixels = imageData.data;
    const width = imageData.width;

    switch (filter) {
      case "bw":
        for (let i = 0; i < pixels.length; i += 4) {
          const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          pixels[i] = avg;
          pixels[i + 1] = avg;
          pixels[i + 2] = avg;
        }
        break;

      case "vintage":
        // Warm sepia tone
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          pixels[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          pixels[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          pixels[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        break;

      case "highcontrast":
        for (let i = 0; i < pixels.length; i += 4) {
          const factor = 2.5;
          pixels[i] = Math.min(
            255,
            Math.max(0, factor * (pixels[i] - 128) + 128)
          );
          pixels[i + 1] = Math.min(
            255,
            Math.max(0, factor * (pixels[i + 1] - 128) + 128)
          );
          pixels[i + 2] = Math.min(
            255,
            Math.max(0, factor * (pixels[i + 2] - 128) + 128)
          );
        }
        break;

      case "rainbow":
        // Hue shift based on x position
        for (let i = 0; i < pixels.length; i += 4) {
          const x = (i / 4) % width;
          const hueShift = (x / width) * 360;
          const [h, s, l] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
          const newHue = (h + hueShift) % 360;
          const [nr, ng, nb] = hslToRgb(newHue, Math.min(1, s * 1.5), l);
          pixels[i] = nr;
          pixels[i + 1] = ng;
          pixels[i + 2] = nb;
        }
        break;

      case "vibrant":
        // Warm/orange saturation boost
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          pixels[i] = Math.min(255, r * 1.3 + 30);
          pixels[i + 1] = Math.min(255, g * 0.9);
          pixels[i + 2] = Math.min(255, b * 0.7);
        }
        break;

      case "coldblue":
        // Cool blue/purple tint
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          pixels[i] = Math.min(255, r * 0.7 + 40);
          pixels[i + 1] = Math.min(255, g * 0.8 + 20);
          pixels[i + 2] = Math.min(255, b * 1.2 + 50);
        }
        break;

      case "xray":
        // Inverted with blue/cyan tint
        for (let i = 0; i < pixels.length; i += 4) {
          const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          const inverted = 255 - avg;
          pixels[i] = Math.min(255, inverted * 0.7);
          pixels[i + 1] = Math.min(255, inverted * 1.1 + 30);
          pixels[i + 2] = Math.min(255, inverted * 1.2 + 50);
        }
        break;

      case "neon":
        // Hot pink/magenta neon
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const brightness = (r + g + b) / 3;
          pixels[i] = Math.min(255, brightness * 0.9 + r * 0.5 + 60);
          pixels[i + 1] = Math.min(255, brightness * 0.3);
          pixels[i + 2] = Math.min(255, brightness * 0.7 + b * 0.5 + 40);
        }
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Render video frame to a canvas with filter
   * @param {HTMLCanvasElement} canvas - Target canvas
   * @param {string} filterId - Filter to apply
   */
  function renderToCanvas(canvas, filterId) {
    if (!videoElement || videoElement.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw mirrored video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Apply filter
    if (filterId !== "normal") {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyFilter(ctx, imageData, filterId);
    }
  }

  // Color conversion helpers
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return [h * 360, s, l];
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Set current filter
   */
  function setFilter(filterId) {
    currentFilter = filterId;
  }

  /**
   * Get current filter
   */
  function getFilter() {
    return currentFilter;
  }

  /**
   * Capture frame from a specific canvas
   * @param {HTMLCanvasElement} canvas
   */
  function captureFromCanvas(canvas) {
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  /**
   * Get video element
   */
  function getVideoElement() {
    return videoElement;
  }

  // Export to global scope
  window.PhotoboothSketch = {
    create: createPhotoboothSketch,
    setFilter,
    getFilter,
    captureFromCanvas,
    getVideoElement,
    renderToCanvas,
    applyFilter,
    FILTERS,
  };
})();
