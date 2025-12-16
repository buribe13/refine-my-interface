/**
 * Photo Booth Main Application
 * Classic macOS Photo Booth style with 3x3 filter grid
 */

(function () {
  "use strict";

  // Paging constants for effects grid
  const TOTAL_PAGES = 2;
  const FILTERS_PER_PAGE = 9; // 3x3 grid per page = 9 filters

  // Application state
  const App = {
    // UI elements
    elements: {},

    // Filter canvases for 3x3 grid
    filterCanvases: new Map(),
    mainCanvas: null,

    // View mode
    viewMode: "grid", // 'grid' or 'single'

    // Current effects page (0 or 1)
    currentPage: 0,

    // Window state
    window: {
      x: 0,
      y: 0,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    },

    // Capture state
    capture: {
      isCapturing: false,
      countdown: null,
    },

    // Gallery
    gallery: [],
    currentPreview: null,

    // ML state
    ml: {
      handReady: false,
      faceReady: false,
    },

    // Pinch drag state
    pinch: {
      active: false,
      startWindowPos: { x: 0, y: 0 },
      startPinchPos: { x: 0, y: 0 },
    },

    // Smile cooldown
    smileCooldown: false,

    // Animation frame
    animationId: null,

    // Swipe gesture tracking
    swipe: {
      startX: null,
      endX: null,
      threshold: 50,
    },
  };

  /**
   * Initialize application
   */
  function init() {
    console.log("[App] Initializing Photo Booth...");

    // Cache DOM elements
    cacheElements();

    // Center window
    centerWindow();

    // Setup event listeners
    setupEventListeners();

    // Update time
    updateTime();
    setInterval(updateTime, 1000);

    // Build filter grid
    buildFilterGrid();

    // Initial gallery render (hides strip if empty)
    renderGallery();

    // Initialize p5 sketch
    initSketch();
  }

  /**
   * Cache DOM element references
   */
  function cacheElements() {
    App.elements = {
      // Window
      window: document.getElementById("photobooth-window"),
      titlebar: document.getElementById("titlebar"),

      // Preview
      p5Container: document.getElementById("p5-container"),
      previewContainer: document.getElementById("preview-container"),
      filterGrid: document.getElementById("filter-grid"),
      singleView: document.getElementById("single-view"),
      loadingOverlay: document.getElementById("loading-overlay"),
      loadingMessage: document.getElementById("loading-message"),
      flashOverlay: document.getElementById("flash-overlay"),
      countdownOverlay: document.getElementById("countdown-overlay"),
      countdownNumber: document.getElementById("countdown-number"),

      // Status
      statusIndicators: document.getElementById("status-indicators"),
      handStatus: document.getElementById("hand-status"),
      faceStatus: document.getElementById("face-status"),
      smileIndicator: document.getElementById("smile-indicator"),

      // Controls
      btnGallery: document.getElementById("btn-gallery"),
      btnTimer: document.getElementById("btn-timer"),
      btnCapture: document.getElementById("btn-capture"),
      btnEffects: document.getElementById("btn-effects"),

      // Page dots
      pageDots: document.getElementById("page-dots"),

      // Gallery
      galleryStrip: document.getElementById("gallery-strip"),
      galleryItems: document.getElementById("gallery-items"),
      galleryEmpty: document.getElementById("gallery-empty"),

      // Modal
      previewModal: document.getElementById("preview-modal"),
      modalImage: document.getElementById("modal-image"),
      btnDownload: document.getElementById("btn-download"),
      btnDelete: document.getElementById("btn-delete"),
      btnCloseModal: document.getElementById("btn-close-modal"),

      // Menu bar
      menubarTime: document.getElementById("menubar-time"),
    };

    // Get main canvas
    App.mainCanvas = document.getElementById("main-canvas");
  }

  /**
   * Get filters for the current page
   */
  function getFiltersForPage(page) {
    const allFilters = window.PhotoboothSketch.FILTERS;
    const start = page * FILTERS_PER_PAGE;
    const end = start + FILTERS_PER_PAGE;
    return allFilters.slice(start, end);
  }

  /**
   * Build the 3x3 filter grid with canvases for current page
   */
  function buildFilterGrid() {
    const grid = App.elements.filterGrid;
    grid.innerHTML = "";

    // Clear old canvas references
    App.filterCanvases.clear();

    // Get filters for current page
    const filtersForPage = getFiltersForPage(App.currentPage);
    const currentFilter = window.PhotoboothSketch.getFilter();

    filtersForPage.forEach((filter, index) => {
      const cell = document.createElement("div");
      cell.className = `filter-cell ${
        filter.id === currentFilter ? "selected" : ""
      }`;
      cell.dataset.filterId = filter.id;

      // Create canvas for this filter
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 144;

      const label = document.createElement("span");
      label.className = "filter-label";
      label.textContent = filter.name;

      cell.appendChild(canvas);
      cell.appendChild(label);

      // Store canvas reference
      App.filterCanvases.set(filter.id, canvas);

      // Click handler - select filter
      cell.addEventListener("click", () => selectFilter(filter.id));

      // Double-click - go to single view
      cell.addEventListener("dblclick", () => {
        selectFilter(filter.id);
        setViewMode("single");
      });

      grid.appendChild(cell);
    });

    // Set up main canvas dimensions
    if (App.mainCanvas) {
      App.mainCanvas.width = 600;
      App.mainCanvas.height = 450;
    }

    // Update page dots
    updatePageDots();
  }

  /**
   * Update page dots to reflect current page
   */
  function updatePageDots() {
    const dots = App.elements.pageDots.querySelectorAll(".dot");
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === App.currentPage);
    });
  }

  /**
   * Set the current effects page
   */
  function setPage(page) {
    if (page < 0 || page >= TOTAL_PAGES) return;
    if (page === App.currentPage) return;

    App.currentPage = page;

    // Check if current filter is on this page
    const filtersOnPage = getFiltersForPage(page);
    const currentFilter = window.PhotoboothSketch.getFilter();
    const isOnPage = filtersOnPage.some((f) => f.id === currentFilter);

    // If current filter is not on this page, select the center filter
    if (!isOnPage && filtersOnPage.length > 0) {
      const centerIndex = Math.floor(filtersOnPage.length / 2);
      selectFilter(filtersOnPage[centerIndex].id);
    }

    // Rebuild the grid for the new page
    buildFilterGrid();
  }

  /**
   * Setup swipe gesture handling on filter grid
   */
  function setupSwipeGestures() {
    const grid = App.elements.filterGrid;

    grid.addEventListener("touchstart", (e) => {
      App.swipe.startX = e.touches[0].clientX;
      App.swipe.endX = null;
    });

    grid.addEventListener("touchmove", (e) => {
      App.swipe.endX = e.touches[0].clientX;
    });

    grid.addEventListener("touchend", () => {
      if (App.swipe.startX === null || App.swipe.endX === null) return;

      const diff = App.swipe.startX - App.swipe.endX;

      if (Math.abs(diff) > App.swipe.threshold) {
        if (diff > 0 && App.currentPage < TOTAL_PAGES - 1) {
          // Swipe left -> next page
          setPage(App.currentPage + 1);
        } else if (diff < 0 && App.currentPage > 0) {
          // Swipe right -> previous page
          setPage(App.currentPage - 1);
        }
      }

      App.swipe.startX = null;
      App.swipe.endX = null;
    });
  }

  /**
   * Select a filter
   */
  function selectFilter(filterId) {
    window.PhotoboothSketch.setFilter(filterId);

    // Update selected state in grid
    document.querySelectorAll(".filter-cell").forEach((cell) => {
      cell.classList.toggle("selected", cell.dataset.filterId === filterId);
    });
  }

  /**
   * Set view mode (grid or single)
   */
  function setViewMode(mode) {
    App.viewMode = mode;

    if (mode === "single") {
      App.elements.previewContainer.classList.add("single-mode");
      App.elements.btnEffects.classList.add("active");
    } else {
      App.elements.previewContainer.classList.remove("single-mode");
      App.elements.btnEffects.classList.remove("active");
    }
  }

  /**
   * Center window on screen
   */
  function centerWindow() {
    const windowEl = App.elements.window;
    const windowWidth = windowEl.offsetWidth;
    const windowHeight = windowEl.offsetHeight;

    App.window.x = Math.max(50, (window.innerWidth - windowWidth) / 2);
    App.window.y = Math.max(40, (window.innerHeight - windowHeight) / 2);

    updateWindowPosition();
  }

  /**
   * Update window position in DOM
   */
  function updateWindowPosition() {
    App.elements.window.style.left = `${App.window.x}px`;
    App.elements.window.style.top = `${App.window.y}px`;
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Window dragging
    App.elements.titlebar.addEventListener("mousedown", onTitlebarMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    // Capture button
    App.elements.btnCapture.addEventListener("click", onCaptureClick);

    // Effects button - toggle view mode
    App.elements.btnEffects.addEventListener("click", () => {
      setViewMode(App.viewMode === "grid" ? "single" : "grid");
    });

    // Gallery button (placeholder)
    App.elements.btnGallery.addEventListener("click", () => {
      // TODO: Toggle gallery view
    });

    // Page dots - click to change page
    const dots = App.elements.pageDots.querySelectorAll(".dot");
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => setPage(index));
    });

    // Swipe gestures on filter grid
    setupSwipeGestures();

    // Modal
    App.elements.btnDownload.addEventListener("click", onDownload);
    App.elements.btnDelete.addEventListener("click", onDelete);
    App.elements.btnCloseModal.addEventListener("click", closeModal);
    document
      .querySelector(".modal-backdrop")
      .addEventListener("click", closeModal);

    // Keyboard shortcuts
    document.addEventListener("keydown", onKeyDown);

    // Window resize
    window.addEventListener("resize", onWindowResize);
  }

  /**
   * Initialize p5 sketch
   */
  function initSketch() {
    const container = App.elements.p5Container;
    const width = 640;
    const height = 480;

    App.elements.loadingMessage.textContent = "Starting camera...";

    window.PhotoboothSketch.create(container, width, height, onVideoReady);
  }

  /**
   * Called when video is ready
   */
  async function onVideoReady(videoElement) {
    console.log("[App] Video ready, initializing ML...");

    App.elements.loadingMessage.textContent = "Loading gesture controls...";

    // Initialize ML models
    const results = await Promise.allSettled([
      window.HandTracker.init(videoElement),
      window.FaceTracker.init(videoElement),
    ]);

    if (results[0].status === "fulfilled") {
      App.ml.handReady = true;
      console.log("[App] Hand tracking ready");
    }

    if (results[1].status === "fulfilled") {
      App.ml.faceReady = true;
      console.log("[App] Face tracking ready");
    }

    // Hide loading overlay
    App.elements.loadingOverlay.classList.add("hidden");

    // Show status indicators
    App.elements.statusIndicators.classList.remove("hidden");
    App.elements.smileIndicator.classList.remove("hidden");

    // Start render loop
    startRenderLoop();

    // Start ML detection loop
    startMLLoop();
  }

  /**
   * Start the render loop for filter canvases
   */
  function startRenderLoop() {
    const render = () => {
      const video = window.PhotoboothSketch.getVideoElement();
      if (!video || video.readyState < 2) {
        App.animationId = requestAnimationFrame(render);
        return;
      }

      if (App.viewMode === "grid") {
        // Render only filter canvases for current page
        App.filterCanvases.forEach((canvas, filterId) => {
          if (canvas) {
            window.PhotoboothSketch.renderToCanvas(canvas, filterId);
          }
        });
      } else {
        // Render main canvas with selected filter
        if (App.mainCanvas) {
          window.PhotoboothSketch.renderToCanvas(
            App.mainCanvas,
            window.PhotoboothSketch.getFilter()
          );
        }
      }

      App.animationId = requestAnimationFrame(render);
    };

    App.animationId = requestAnimationFrame(render);
  }

  /**
   * Start ML detection loop
   */
  function startMLLoop() {
    const detect = () => {
      // Hand tracking
      if (App.ml.handReady) {
        const handState = window.HandTracker.getState();
        updateHandStatus(handState);
        handlePinchDrag(handState);
      }

      // Face tracking
      if (App.ml.faceReady) {
        const faceState = window.FaceTracker.getState();
        updateFaceStatus(faceState);
        handleSmileTrigger(faceState);
      }

      requestAnimationFrame(detect);
    };

    detect();
  }

  /**
   * Update hand status display
   */
  function updateHandStatus(state) {
    const badge = App.elements.handStatus;
    const label = badge.querySelector(".label");

    badge.classList.toggle("active", App.ml.handReady);
    label.textContent = `Hand: ${state.isPinching ? "Pinching" : "Tracking"}`;
  }

  /**
   * Update face status display
   */
  function updateFaceStatus(state) {
    const badge = App.elements.faceStatus;
    const label = badge.querySelector(".label");

    badge.classList.toggle("active", App.ml.faceReady);
    label.textContent = `Face: ${state.isSmiling ? "Smiling!" : "Tracking"}`;

    // Update smile indicator
    const indicator = App.elements.smileIndicator;
    const text = indicator.querySelector(".text");

    indicator.classList.remove("detecting", "triggered");

    if (state.isSmiling) {
      indicator.classList.add("triggered");
      text.textContent = "Smile detected!";
    } else if (state.mouthOpenness > 0.05) {
      indicator.classList.add("detecting");
      text.textContent = "Keep smiling...";
    } else {
      text.textContent = "Smile with teeth to capture";
    }
  }

  /**
   * Handle pinch drag for window movement
   */
  function handlePinchDrag(state) {
    const videoEl = window.PhotoboothSketch.getVideoElement();
    if (!videoEl) return;

    const videoWidth = videoEl.videoWidth || 640;
    const videoHeight = videoEl.videoHeight || 480;

    if (state.isPinching && state.position) {
      const previewRect = App.elements.previewContainer.getBoundingClientRect();
      const screenX =
        previewRect.left +
        (1 - state.position.x / videoWidth) * previewRect.width;
      const screenY =
        previewRect.top + (state.position.y / videoHeight) * previewRect.height;

      if (!App.pinch.active) {
        const titlebarRect = App.elements.titlebar.getBoundingClientRect();

        if (
          screenX >= titlebarRect.left &&
          screenX <= titlebarRect.right &&
          screenY >= titlebarRect.top &&
          screenY <= titlebarRect.bottom
        ) {
          App.pinch.active = true;
          App.pinch.startWindowPos = { x: App.window.x, y: App.window.y };
          App.pinch.startPinchPos = { x: screenX, y: screenY };
          App.elements.titlebar.classList.add("dragging");
        }
      } else {
        const deltaX = screenX - App.pinch.startPinchPos.x;
        const deltaY = screenY - App.pinch.startPinchPos.y;

        App.window.x = Math.max(
          0,
          Math.min(
            App.pinch.startWindowPos.x + deltaX,
            window.innerWidth - App.elements.window.offsetWidth
          )
        );
        App.window.y = Math.max(
          24,
          Math.min(App.pinch.startWindowPos.y + deltaY, window.innerHeight - 50)
        );

        updateWindowPosition();
      }
    } else {
      if (App.pinch.active) {
        App.pinch.active = false;
        App.elements.titlebar.classList.remove("dragging");
      }
    }
  }

  /**
   * Handle smile trigger for auto capture
   */
  function handleSmileTrigger(state) {
    if (state.isSmiling && !App.smileCooldown && !App.capture.isCapturing) {
      triggerCapture();

      App.smileCooldown = true;
      setTimeout(() => {
        App.smileCooldown = false;
      }, 3000);
    }
  }

  /**
   * Handle capture button click
   */
  function onCaptureClick() {
    if (!App.capture.isCapturing) {
      triggerCapture();
    }
  }

  /**
   * Trigger photo capture
   */
  async function triggerCapture() {
    if (App.capture.isCapturing) return;

    App.capture.isCapturing = true;
    App.elements.btnCapture.disabled = true;

    // Countdown
    for (let i = 3; i >= 1; i--) {
      App.elements.countdownOverlay.classList.remove("hidden");
      App.elements.countdownNumber.textContent = i;
      await sleep(1000);
    }
    App.elements.countdownOverlay.classList.add("hidden");

    // Flash
    App.elements.flashOverlay.classList.add("active");
    setTimeout(() => App.elements.flashOverlay.classList.remove("active"), 300);

    // Capture from appropriate canvas
    let canvas;
    const currentFilter = window.PhotoboothSketch.getFilter();

    if (App.viewMode === "grid") {
      canvas = App.filterCanvases.get(currentFilter);
    } else {
      canvas = App.mainCanvas;
    }

    if (canvas) {
      const dataUrl = window.PhotoboothSketch.captureFromCanvas(canvas);
      if (dataUrl) {
        addToGallery(dataUrl);
      }
    }

    App.capture.isCapturing = false;
    App.elements.btnCapture.disabled = false;
  }

  /**
   * Add image to gallery
   */
  function addToGallery(dataUrl) {
    const image = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dataUrl,
      timestamp: Date.now(),
      filter: window.PhotoboothSketch.getFilter(),
    };

    App.gallery.unshift(image);
    renderGallery();
  }

  /**
   * Render gallery thumbnails
   */
  function renderGallery() {
    const container = App.elements.galleryItems;
    const galleryStrip = App.elements.galleryStrip;
    container.innerHTML = "";

    // Hide entire gallery strip when empty
    if (App.gallery.length === 0) {
      galleryStrip.classList.add("hidden");
      App.elements.galleryEmpty.classList.remove("hidden");
      return;
    }

    // Show gallery strip when we have images
    galleryStrip.classList.remove("hidden");
    App.elements.galleryEmpty.classList.add("hidden");

    App.gallery.forEach((image) => {
      const thumb = document.createElement("div");
      thumb.className = "gallery-thumb";
      thumb.innerHTML = `
        <img src="${image.dataUrl}" alt="Photo ${image.timestamp}">
        <button class="delete-btn" data-id="${image.id}">&times;</button>
      `;

      thumb
        .querySelector("img")
        .addEventListener("click", () => openPreview(image));
      thumb.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteImage(image.id);
      });

      container.appendChild(thumb);
    });
  }

  /**
   * Open preview modal
   */
  function openPreview(image) {
    App.currentPreview = image;
    App.elements.modalImage.src = image.dataUrl;
    App.elements.previewModal.classList.remove("hidden");
  }

  /**
   * Close preview modal
   */
  function closeModal() {
    App.elements.previewModal.classList.add("hidden");
    App.currentPreview = null;
  }

  /**
   * Download current preview
   */
  function onDownload() {
    if (!App.currentPreview) return;

    const a = document.createElement("a");
    a.href = App.currentPreview.dataUrl;
    a.download = `photobooth-${App.currentPreview.timestamp}.jpg`;
    a.click();
  }

  /**
   * Delete current preview
   */
  function onDelete() {
    if (!App.currentPreview) return;

    deleteImage(App.currentPreview.id);
    closeModal();
  }

  /**
   * Delete image by ID
   */
  function deleteImage(id) {
    App.gallery = App.gallery.filter((img) => img.id !== id);
    renderGallery();
  }

  /**
   * Titlebar mouse down handler
   */
  function onTitlebarMouseDown(e) {
    if (e.target.classList.contains("window-btn")) return;

    App.window.isDragging = true;
    App.window.dragOffset = {
      x: e.clientX - App.window.x,
      y: e.clientY - App.window.y,
    };

    App.elements.titlebar.classList.add("dragging");
  }

  /**
   * Mouse move handler
   */
  function onMouseMove(e) {
    if (!App.window.isDragging) return;

    App.window.x = Math.max(
      0,
      Math.min(
        e.clientX - App.window.dragOffset.x,
        window.innerWidth - App.elements.window.offsetWidth
      )
    );
    App.window.y = Math.max(
      24,
      Math.min(e.clientY - App.window.dragOffset.y, window.innerHeight - 50)
    );

    updateWindowPosition();
  }

  /**
   * Mouse up handler
   */
  function onMouseUp() {
    App.window.isDragging = false;
    App.elements.titlebar.classList.remove("dragging");
  }

  /**
   * Keyboard handler
   */
  function onKeyDown(e) {
    // Spacebar - capture
    if (e.code === "Space" && !App.capture.isCapturing) {
      e.preventDefault();
      triggerCapture();
    }

    // E - toggle effects/view mode
    if (e.code === "KeyE") {
      setViewMode(App.viewMode === "grid" ? "single" : "grid");
    }

    // Escape - close modal
    if (e.code === "Escape") {
      if (!App.elements.previewModal.classList.contains("hidden")) {
        closeModal();
      }
    }
  }

  /**
   * Window resize handler
   */
  function onWindowResize() {
    App.window.x = Math.max(
      0,
      Math.min(
        App.window.x,
        window.innerWidth - App.elements.window.offsetWidth
      )
    );
    App.window.y = Math.max(
      24,
      Math.min(App.window.y, window.innerHeight - 50)
    );
    updateWindowPosition();
  }

  /**
   * Update menu bar time
   */
  function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, "0");
    App.elements.menubarTime.textContent = `${hour12}:${minuteStr} ${ampm}`;
  }

  /**
   * Sleep utility
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Initialize on DOM ready
  document.addEventListener("DOMContentLoaded", init);
})();
