# Iteration Log

This document tracks the development iterations of the Retro Photo Booth prototype, from initial concept to final implementation.

---

## Iteration 1: Look & Feel (Visual Foundation)

### Goals
- Establish the retro macOS aesthetic
- Create the basic window structure
- Implement desktop background

### Implementation

**Desktop Background**
- Aqua-style gradient: `#4a90d9` → `#1e3a5f` (top to bottom)
- Subtle noise texture overlay (3% opacity SVG filter)
- Full viewport coverage

**Menu Bar**
- Classic macOS menu bar with apple logo
- File, Edit, View, Special, Help menus
- Live clock display (12-hour format)

**Window Chrome**
- Metallic gradient title bar
- Traffic light buttons (close, minimize, zoom)
- Centered window title
- Rounded corners (8px radius)
- Drop shadow for depth

### Challenges
- Matching the exact macOS Aqua gradient was tricky
- Traffic light buttons needed careful color matching
- Window shadow required multiple layers for realism

### Outcome
Successfully created a visually authentic retro macOS environment that provides the nostalgic context for the Photo Booth experience.

---

## Iteration 2: Camera & Filters (Core Functionality)

### Goals
- Integrate webcam capture via p5.js
- Implement mirrored "selfie" view
- Create filter effects

### Implementation

**p5.js Sketch**
- `createCapture(VIDEO)` for webcam access
- Canvas sized to container (636x360)
- Mirrored drawing via `translate` + `scale(-1, 1)`

**Filter Pipeline**
- Pixel manipulation in draw loop
- `loadPixels()` → transform → `updatePixels()`
- 8 filters implemented:
  1. Normal (passthrough)
  2. B&W (average RGB)
  3. Sepia (color matrix)
  4. High Contrast (factor 2.5)
  5. Posterize (4 levels)
  6. Pixelate (8px blocks)
  7. Invert (255 - value)
  8. Thermal (grayscale → heat map)

**Effects Panel**
- Grid layout (4x2)
- Preview swatches for each filter
- Click to select and close panel

### Challenges
- Pixelate filter was slow; optimized with block averaging
- Thermal gradient required careful color stop mapping
- Effects panel needed z-index management

### Outcome
Fully functional camera preview with real-time filter application matching classic Photo Booth capabilities.

---

## Iteration 3: Embodied Control (ML Integration)

### Goals
- Implement hand tracking for pinch gesture
- Implement face tracking for smile detection
- Map gestures to application controls

### Implementation

**Hand Tracking (ml5 handPose)**
```javascript
// Key parameters
PINCH_THRESHOLD: 40    // pixels
PINCH_HYSTERESIS: 10   // prevents flicker
REQUIRED_FRAMES: 3     // stability
```

- Detects thumb_tip and index_finger_tip
- Calculates Euclidean distance
- Uses hysteresis for stable state transitions
- Converts video coords to screen coords (with X flip for mirror)

**Face Tracking (ml5 faceMesh)**
```javascript
// Key parameters
MOUTH_OPEN_THRESHOLD: 0.08   // 8% of face height
MOUTH_WIDTH_THRESHOLD: 0.35  // 35% of face width
REQUIRED_FRAMES: 5           // stability
```

- Uses MediaPipe landmark indices
- Measures lip separation and mouth width
- Both metrics must exceed thresholds
- Gradual decay prevents sudden state loss

**Integration**
- ML models load in parallel for faster startup
- Detection loop runs via `requestAnimationFrame`
- Status badges show real-time tracking state

### Challenges
- Coordinate mapping between video and screen was complex
- Pinch detection needed careful threshold tuning
- Smile detection had false positives with open-mouth talking
- Loading two ML models caused initial delay

### Outcome
Working gesture controls that feel responsive and natural, with clear visual feedback of detection state.

---

## Iteration 4: Strip Mode (Enhanced Capture)

### Goals
- Add 4-photo strip capture mode
- Implement burst timing
- Create strip composition

### Implementation

**Mode Toggle**
- Two mode buttons in control strip
- Single mode: standard countdown + capture
- Strip mode: countdown + 4 captures with 1.5s intervals

**Burst Capture**
```javascript
// Capture sequence
1. 3-2-1 countdown
2. Flash + capture frame 1
3. Wait 1.5s
4. Flash + capture frame 2
5. Wait 1.5s
6. Flash + capture frame 3
7. Wait 1.5s
8. Flash + capture frame 4
9. Compose strip
```

**Strip Composition**
- Canvas-based composition
- Vertical layout (classic photo strip style)
- White border (16px)
- 8px padding between frames
- Output as single JPEG

### Challenges
- Timing coordination required careful async/await
- UI state management during burst was complex
- Strip composition needed proper dimension calculation

### Outcome
Authentic photo strip functionality that matches the classic Photo Booth 4-up mode.

---

## Iteration 5: Gallery & Polish (Final Refinement)

### Goals
- Implement photo gallery
- Add preview modal
- Polish interactions and UX

### Implementation

**Session Gallery**
- In-memory array storage (session-only per requirements)
- Thumbnail strip at bottom of window
- Horizontal scroll for overflow
- Delete buttons on hover

**Preview Modal**
- Full-size image display
- Download button (generates filename with timestamp)
- Delete button (removes from gallery)
- Click backdrop or Escape to close

**Keyboard Shortcuts**
- Spacebar: Capture photo
- E: Toggle effects panel
- Escape: Close modal/panel

**Final Polish**
- Loading states with spinner
- Error handling for camera access
- Responsive bounds checking for window position
- Smooth transitions and animations

### Challenges
- Gallery scroll needed custom scrollbar styling
- Modal backdrop click handling required event stopping
- Window bounds checking on resize needed attention

### Outcome
Complete, polished application with intuitive UX and all planned features implemented.

---

## Summary

| Iteration | Focus | Key Deliverables |
|-----------|-------|------------------|
| 1 | Look & Feel | Desktop, menu bar, window chrome |
| 2 | Camera & Filters | p5 sketch, 8 filters, effects panel |
| 3 | Embodied Control | Pinch drag, smile capture, status UI |
| 4 | Strip Mode | 4-photo burst, strip composition |
| 5 | Gallery & Polish | Thumbnails, modal, keyboard shortcuts |

Total development followed an iterative approach, with each phase building on the previous while maintaining a working prototype at each stage.

