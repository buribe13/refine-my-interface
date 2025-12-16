"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  MutableRefObject,
} from "react";
import {
  FilterType,
  FILTERS,
  applyFilterToImageData,
} from "@/lib/p5/createSketch";
import { initHandpose, getHandState, HandState } from "@/lib/ml/hand";
import { initFacemesh, getFaceState, FaceState } from "@/lib/ml/face";
import {
  saveImage,
  loadImages,
  deleteImage,
  GalleryImage,
} from "@/lib/storage/gallery";

interface PhotoBoothAppProps {
  windowX: number;
  windowY: number;
  windowWidth: number;
  onPinchStart: (x: number, y: number) => void;
  pinchDragRef: MutableRefObject<{
    onPinchMove: (x: number, y: number) => void;
    onPinchStart: (x: number, y: number) => void;
    onPinchEnd: () => void;
  } | null>;
}

type ViewMode = "grid" | "single" | "gallery";

export default function PhotoBoothApp({
  windowX,
  windowY,
  windowWidth,
  onPinchStart,
  pinchDragRef,
}: PhotoBoothAppProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>("normal");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // ML states
  const [handState, setHandState] = useState<HandState>({
    isPinching: false,
    position: null,
  });
  const [faceState, setFaceState] = useState<FaceState>({
    isSmiling: false,
    mouthOpenness: 0,
  });
  const [mlReady, setMlReady] = useState({ hand: false, face: false });

  // Cooldowns
  const smileCooldownRef = useRef(false);
  const lastPinchPosRef = useRef<{ x: number; y: number } | null>(null);
  const wasPinchingRef = useRef(false);

  // Capture function
  const capturePhoto = useCallback(async () => {
    if (!mainCanvasRef.current || countdown !== null) return;

    // Start countdown
    setCountdown(3);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCountdown(2);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCountdown(1);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCountdown(null);

    // Flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);

    // Get the appropriate canvas based on view mode
    let canvas: HTMLCanvasElement | null = null;
    if (viewMode === "grid") {
      // In grid view, capture the selected filter's canvas
      canvas = canvasRefs.current.get(currentFilter) || null;
    } else {
      canvas = mainCanvasRef.current;
    }

    if (!canvas) return;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/jpeg",
          0.9
        );
      });

      const image = await saveImage(blob, currentFilter);
      setGallery((prev) => [image, ...prev]);
    } catch (err) {
      console.error("Failed to save image:", err);
    }
  }, [currentFilter, countdown, viewMode]);

  // Initialize camera
  useEffect(() => {
    setLoadingMessage("Starting camera...");

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });

        videoRef.current = video;
        initML(video);
        startRenderLoop();
      } catch (err) {
        console.error("Camera error:", err);
        setError(
          `Failed to access camera: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        setIsLoading(false);
      }
    };

    initCamera();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Start render loop for filter previews
  const startRenderLoop = useCallback(() => {
    const render = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Render each filter preview in grid mode
      if (viewMode === "grid") {
        FILTERS.forEach((filter) => {
          const canvas = canvasRefs.current.get(filter.id);
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Draw mirrored video
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Apply filter
          if (filter.id !== "normal") {
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            applyFilterToImageData(imageData, filter.id, canvas.width);
            ctx.putImageData(imageData, 0, 0);
          }
        });
      }

      // Render main canvas for single view
      if (viewMode === "single" && mainCanvasRef.current) {
        const canvas = mainCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          if (currentFilter !== "normal") {
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            applyFilterToImageData(imageData, currentFilter, canvas.width);
            ctx.putImageData(imageData, 0, 0);
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
  }, [viewMode, currentFilter]);

  // Restart render loop when view mode changes
  useEffect(() => {
    if (videoRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startRenderLoop();
    }
  }, [viewMode, startRenderLoop]);

  // Initialize ML models
  const initML = async (video: HTMLVideoElement) => {
    setLoadingMessage("Loading gesture controls...");

    const [handResult, faceResult] = await Promise.allSettled([
      initHandpose(video).then(() => {
        console.log("[PhotoBooth] Hand tracking ready");
        setMlReady((prev) => ({ ...prev, hand: true }));
      }),
      initFacemesh(video).then(() => {
        console.log("[PhotoBooth] Face detection ready");
        setMlReady((prev) => ({ ...prev, face: true }));
      }),
    ]);

    if (handResult.status === "rejected") {
      console.error("Failed to init handpose:", handResult.reason);
    }
    if (faceResult.status === "rejected") {
      console.error("Failed to init facemesh:", faceResult.reason);
    }

    setIsLoading(false);
  };

  // ML detection loop
  useEffect(() => {
    if (!mlReady.hand && !mlReady.face) return;

    let animationId: number;

    const detect = () => {
      if (mlReady.hand) {
        const state = getHandState();
        setHandState(state);

        if (state.isPinching && state.position) {
          const videoWidth = videoRef.current?.videoWidth || 640;
          const videoHeight = videoRef.current?.videoHeight || 480;

          const screenX =
            windowX + (1 - state.position.x / videoWidth) * windowWidth;
          const screenY = windowY + 22 + (state.position.y / videoHeight) * 350;

          if (!wasPinchingRef.current) {
            onPinchStart(screenX, screenY);
            lastPinchPosRef.current = { x: screenX, y: screenY };
            wasPinchingRef.current = true;
          } else if (pinchDragRef.current && lastPinchPosRef.current) {
            pinchDragRef.current.onPinchMove(screenX, screenY);
            lastPinchPosRef.current = { x: screenX, y: screenY };
          }
        } else {
          if (wasPinchingRef.current && pinchDragRef.current) {
            pinchDragRef.current.onPinchEnd();
          }
          wasPinchingRef.current = false;
          lastPinchPosRef.current = null;
        }
      }

      if (mlReady.face) {
        const state = getFaceState();
        setFaceState(state);

        if (
          state.isSmiling &&
          !smileCooldownRef.current &&
          countdown === null
        ) {
          smileCooldownRef.current = true;
          capturePhoto();

          setTimeout(() => {
            smileCooldownRef.current = false;
          }, 3000);
        }
      }

      animationId = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    mlReady,
    windowX,
    windowY,
    windowWidth,
    onPinchStart,
    pinchDragRef,
    capturePhoto,
    countdown,
  ]);

  // Load gallery on mount
  useEffect(() => {
    loadImages().then(setGallery);
  }, []);

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteImage(id);
    setGallery((prev) => prev.filter((img) => img.id !== id));
    if (previewImage?.id === id) {
      setPreviewImage(null);
    }
  };

  // Handle download
  const handleDownload = (image: GalleryImage) => {
    const a = document.createElement("a");
    a.href = image.dataUrl;
    a.download = `photobooth-${image.timestamp}.jpg`;
    a.click();
  };

  // Handle filter selection from grid
  const handleFilterSelect = (filterId: FilterType) => {
    setCurrentFilter(filterId);
    // Double-click or single click behavior - stay in grid, select filter
  };

  // Handle filter double-click to enter single view
  const handleFilterDoubleClick = (filterId: FilterType) => {
    setCurrentFilter(filterId);
    setViewMode("single");
  };

  // Register canvas ref
  const registerCanvas = useCallback(
    (filterId: string, canvas: HTMLCanvasElement | null) => {
      if (canvas) {
        canvasRefs.current.set(filterId, canvas);
      } else {
        canvasRefs.current.delete(filterId);
      }
    },
    []
  );

  return (
    <div className="photobooth-container">
      {/* Main View Area */}
      <div className="photobooth-main">
        {viewMode === "grid" && (
          <div className="filter-grid">
            {FILTERS.map((filter) => (
              <div
                key={filter.id}
                className={`filter-grid-item ${
                  currentFilter === filter.id ? "selected" : ""
                }`}
                onClick={() => handleFilterSelect(filter.id)}
                onDoubleClick={() => handleFilterDoubleClick(filter.id)}
              >
                <canvas
                  ref={(el) => registerCanvas(filter.id, el)}
                  width={160}
                  height={120}
                  className="filter-canvas"
                />
                <span className="filter-label">{filter.name}</span>
              </div>
            ))}
          </div>
        )}

        {viewMode === "single" && (
          <div className="single-view">
            <canvas
              ref={mainCanvasRef}
              width={windowWidth - 40}
              height={Math.floor((windowWidth - 40) * 0.75)}
              className="main-canvas"
            />
          </div>
        )}

        {viewMode === "gallery" && (
          <div className="gallery-view">
            {gallery.length === 0 ? (
              <div className="gallery-empty">
                <span>📷</span>
                <p>No photos yet</p>
                <p>Smile or click capture to take a photo!</p>
              </div>
            ) : (
              <div className="gallery-grid">
                {gallery.map((img) => (
                  <div
                    key={img.id}
                    className="gallery-item"
                    onClick={() => setPreviewImage(img)}
                  >
                    <img src={img.dataUrl} alt={`Photo ${img.timestamp}`} />
                    <button
                      className="gallery-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span>{loadingMessage}</span>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="loading-overlay error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
            <button
              className="aqua-button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )}

        {/* Status indicators */}
        {!isLoading && viewMode !== "gallery" && (
          <div className="status-indicator">
            <div className={`status-badge ${mlReady.hand ? "active" : ""}`}>
              <span className="dot" />
              <span>
                Hand: {handState.isPinching ? "Pinching" : "Tracking"}
              </span>
            </div>
            <div className={`status-badge ${mlReady.face ? "active" : ""}`}>
              <span className="dot" />
              <span>Face: {faceState.isSmiling ? "Smiling!" : "Tracking"}</span>
            </div>
          </div>
        )}

        {/* Smile indicator */}
        {!isLoading && mlReady.face && viewMode !== "gallery" && (
          <div
            className={`smile-indicator ${
              faceState.mouthOpenness > 0.3 ? "detecting" : ""
            } ${faceState.isSmiling ? "triggered" : ""}`}
          >
            <span>😁</span>
            <span>
              {faceState.isSmiling
                ? "Smile detected!"
                : faceState.mouthOpenness > 0.3
                ? "Keep smiling..."
                : "Smile with teeth to capture"}
            </span>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {/* Flash effect */}
        <div className={`flash-overlay ${isFlashing ? "active" : ""}`} />
      </div>

      {/* Page dots for grid view */}
      {viewMode === "grid" && (
        <div className="page-dots">
          <span className={`dot ${currentPage === 0 ? "active" : ""}`} />
          <span className="dot" />
        </div>
      )}

      {/* Bottom Controls */}
      <div className="photobooth-controls">
        <div className="controls-left">
          <button
            className={`control-btn ${viewMode === "gallery" ? "active" : ""}`}
            onClick={() =>
              setViewMode(viewMode === "gallery" ? "grid" : "gallery")
            }
            title="Gallery"
          >
            {/* Grid/Gallery icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button className="control-btn" title="Timer">
            {/* Timer/Clock icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 6v6l4 2" />
            </svg>
          </button>
        </div>

        <button
          className="capture-btn"
          onClick={capturePhoto}
          disabled={countdown !== null}
          title="Take Photo"
        >
          {/* Camera icon */}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
            <path d="M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
          </svg>
        </button>

        <div className="controls-right">
          <button
            className={`effects-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode(viewMode === "grid" ? "single" : "grid")}
          >
            Effects
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {previewImage && (
        <div className="preview-modal" onClick={() => setPreviewImage(null)}>
          <div
            className="preview-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewImage.dataUrl} alt="Preview" />
            <div className="preview-modal-actions">
              <button
                className="aqua-button"
                onClick={() => handleDownload(previewImage)}
              >
                Download
              </button>
              <button
                className="aqua-button"
                onClick={() => {
                  handleDelete(previewImage.id);
                }}
              >
                Delete
              </button>
              <button
                className="aqua-button primary"
                onClick={() => setPreviewImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
