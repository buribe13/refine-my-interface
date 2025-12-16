# Retro Photo Booth

A high-fidelity interactive Photo Booth web application inspired by classic macOS, featuring embodied interaction through gesture and facial recognition controls. Built with HTML/CSS, p5.js, and ml5.js.

## Concept & "Role in Life"

This project reimagines the nostalgic Photo Booth experience through the lens of embodied computing. Rather than relying solely on traditional mouse/keyboard input, the application responds to your **body as a controller**:

- **Pinch gestures** to drag the window around the desktop
- **Smiling with teeth** to automatically trigger the camera shutter

This approach explores how everyday actions (smiling, hand gestures) can become natural interfaces for digital interaction, reducing the barrier between user intent and digital response.

## Features

### Core Photo Booth Functionality
- Live webcam preview with real-time mirrored video feed
- **8 photo filters**: Normal, B&W, Sepia, High Contrast, Posterize, Pixelate, Invert, Thermal
- **Single photo mode**: Classic countdown + capture
- **4-photo strip mode**: Burst capture with vertical strip output
- Photo capture with countdown timer and flash effect
- In-session photo gallery with thumbnails
- Download and delete captured photos

### Embodied Interaction (No Connected Devices)
- **Pinch-to-Drag**: Use a pinch gesture (thumb + index finger) over the title bar to drag the window around the screen
- **Smile Trigger**: Smile with teeth showing to automatically capture a photo (with 3-second cooldown)
- On-screen status indicators showing hand tracking and face detection states

### Fallback Controls
- **Mouse drag**: Click and drag the title bar to move the window
- **Spacebar**: Press to capture a photo
- **E key**: Toggle effects panel
- **Escape**: Close modals

### Retro Aesthetic
- Authentic Aqua-style desktop background
- Classic macOS window chrome with traffic light buttons
- Menu bar with system clock
- Period-accurate Photo Booth controls

## Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge recommended)
- Webcam access
- Local development server (required for webcam permissions)

### Running Locally

**Option 1: Python**
```bash
cd refine-my-interface
python -m http.server 8000
```
Then open http://localhost:8000

**Option 2: Node.js**
```bash
cd refine-my-interface
npx serve
```
Then open http://localhost:3000

**Option 3: VS Code Live Server**
Right-click `index.html` and select "Open with Live Server"

### Usage

1. **Allow camera access** when prompted
2. Wait for ML models to load (hand tracking → face detection)
3. **Take photos**:
   - Click the red capture button, OR
   - Press spacebar, OR
   - Smile with teeth showing (auto-trigger)
4. **Move the window**:
   - Drag the title bar with mouse, OR
   - Pinch gesture over title bar area
5. **Change modes**: Click the single/strip mode buttons on the left
6. **Change filters**: Click "Effects" button or press E
7. **View photos**: Click thumbnails in the gallery strip
8. **Download/Delete**: Click photo → use modal buttons

## Technical Implementation

### Stack
- **HTML5/CSS3** - Semantic markup and custom styling
- **p5.js** - Creative coding library for video capture and filter processing
- **ml5.js** - Machine learning for handpose and facemesh detection

### File Structure
```
refine-my-interface/
├── index.html          # Main entry point
├── style.css           # Aqua desktop + Photo Booth styling
├── js/
│   ├── main.js              # Application controller
│   ├── photoboothSketch.js  # p5 sketch with filters
│   └── ml/
│       ├── hand.js          # Handpose pinch detection
│       └── face.js          # Facemesh smile detection
└── docs/
    └── ...                  # Documentation
```

### Gesture Detection Details

**Pinch Detection (js/ml/hand.js)**
- Uses ml5 handPose model
- Threshold: 40px between thumb tip and index tip
- Hysteresis: +10px to prevent flickering
- Requires 3 consecutive frames to confirm pinch state
- Position calculated as midpoint between thumb and index

**Smile Detection (js/ml/face.js)**
- Uses ml5 faceMesh model (MediaPipe)
- Mouth openness threshold: 8% of face height
- Mouth width threshold: 35% of face width
- Requires 5 consecutive frames to trigger
- 3-second cooldown after capture

### Filter Pipeline
Filters are applied as pixel operations in the p5 draw loop:
- `loadPixels()` → transform pixels → `updatePixels()`
- Pixelate uses block averaging for performance
- Thermal maps grayscale to 5-stop color gradient (blue → cyan → green → yellow → red)

## Interaction Proposal

### Body as Controller (No Connected Devices)

This prototype uses only the built-in webcam to detect:

1. **Hand Gestures (ml5 handPose)**
   - Detects pinch gesture by measuring distance between thumb tip and index finger tip
   - Pinch over the title bar initiates drag
   - Window follows hand movement while pinching
   - Release pinch to drop the window

2. **Facial Expression (ml5 faceMesh)**
   - Monitors mouth openness ratio (lip separation / face height)
   - Monitors mouth width ratio (corner distance / face width)
   - Triggers shutter when both exceed thresholds (showing teeth in smile)
   - Requires consecutive frames for stability
   - Cooldown prevents rapid-fire captures

### Household Object Extension (Future)
Potential additions:
- Bright sticky note detection for "party mode" (rapid filter cycling)
- Color-thresholded object tracking for additional triggers
- Distance-based interactions using object size

## Iteration Log

### Prototype A: Look & Feel
- Implemented Aqua-style desktop background with gradient
- Created authentic window chrome with title bar
- Added traffic light buttons (close/minimize/zoom)
- Styled control strip with mode toggles and capture button

### Prototype B: Camera & Filters
- Integrated p5.js for webcam capture
- Implemented 8 filter effects with real-time preview
- Added mirrored video for natural "selfie" orientation
- Created effects panel with filter previews

### Prototype C: Embodied Control
- Integrated ml5 handpose for pinch detection
- Implemented pinch-to-drag window movement
- Added facemesh for smile detection
- Tuned thresholds for reliable triggering
- Added on-screen status indicators

### Prototype D: Strip Mode
- Added 4-photo strip capture mode
- Implemented burst timing with per-frame flash
- Created strip compositing (vertical layout with white border)
- Added mode toggle buttons in control strip

### Prototype E: Gallery & Polish
- Implemented in-session gallery with thumbnails
- Added preview modal with download/delete
- Added keyboard shortcuts (spacebar, E, Escape)
- Final styling and responsive adjustments

## Known Limitations

1. **Lighting sensitivity**: Hand/face detection works best in well-lit environments with consistent lighting
2. **Pinch detection range**: Works best when hand is 1-3 feet from camera
3. **Smile false positives**: Talking, yawning, or laughing may trigger shutter
4. **Browser support**: Requires modern browser with WebGL (Chrome/Firefox/Edge recommended)
5. **Mobile**: Not optimized for mobile devices (designed for desktop webcam)
6. **Session storage**: Photos are kept in memory only; refreshing clears the gallery

## Performance Tips

- Close other camera-using applications
- Ensure good lighting (daylight or bright artificial light)
- Keep hand clearly visible in frame for pinch detection
- Face the camera directly for best smile detection

## Future Enhancements

- [ ] Sound effects (shutter click, countdown beeps)
- [ ] CRT scanline overlay option
- [ ] Multiple window support (Finder, etc.)
- [ ] Export to social media formats
- [ ] Gesture-based filter switching
- [ ] Color object detection for additional triggers
- [ ] LocalStorage persistence option

## Credits

- Classic macOS visual design inspiration
- ml5.js - Friendly Machine Learning for the Web
- p5.js - Creative coding library
- MediaPipe - Hand and face landmark detection

## License

MIT License - Educational/Portfolio project
