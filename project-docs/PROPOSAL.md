# Interaction Proposal: Body as Controller

## Project Overview

**Retro Photo Booth** is a high-fidelity prototype that reimagines the classic macOS Photo Booth application through the lens of embodied computing. The project explores how everyday physical actions—smiling, hand gestures—can become natural interfaces for digital interaction.

## Design Philosophy

### From Device to Body

Traditional photo booth applications rely on explicit input devices: a button click, a keyboard press, a touch on a screen. These interactions create a clear separation between the user's intent and the digital response. Our prototype challenges this paradigm by using the body itself as the input device.

When you smile with teeth showing, you're expressing joy or readiness for a photo. The application recognizes this natural expression and responds appropriately by capturing the moment. When you pinch your fingers together and move your hand, you're making an intuitive "grab and drag" gesture that the application interprets to move the window.

### Real-World Control Without Connected Devices

The assignment brief asks for "real-world things not connected to your computer." While the webcam is technically connected, the **inputs** (your body, your expressions) are not electronic devices—they're you. This creates a unique interaction model where:

1. **No wearables required** - No gloves, sensors, or specialized hardware
2. **No calibration needed** - ML models adapt to different users
3. **Natural mappings** - Smile = happy = take photo; Pinch = grab = drag

## Interaction Design

### Primary Interactions

#### 1. Smile-with-Teeth Capture

**Trigger**: Smile showing teeth for approximately 0.3 seconds (5 frames)

**Rationale**: In traditional Photo Booth, you set a timer, pose, and hope you look good when it captures. By detecting smiles, we capture the moment when you're actually expressing the emotion you want to preserve.

**Technical Implementation**:

- ml5 faceMesh detects 468 facial landmarks
- We measure mouth openness (lip separation / face height ratio)
- We measure mouth width (corner distance / face width ratio)
- Both must exceed thresholds: mouth open > 8%, width > 35%
- Requires 5 consecutive frames to prevent false triggers
- 3-second cooldown prevents rapid-fire captures

**Design Decisions**:

- Threshold tuned for "teeth showing" rather than any smile
- Cooldown prevents accidental capture loops
- Visual feedback shows detection progress

#### 2. Pinch-to-Drag Window

**Trigger**: Bring thumb and index finger together (within 40px) over the title bar

**Rationale**: The pinch gesture is universally understood as "grab" or "pick up." By mapping this to window dragging, we create an intuitive spatial interaction that feels like physically moving an object on your desk.

**Technical Implementation**:

- ml5 handPose detects 21 hand landmarks
- Distance calculated between thumb_tip and index_finger_tip
- Hysteresis (+10px) prevents state flickering
- Requires 3 consecutive frames to confirm pinch
- Only activates when pinch position is over title bar region
- Position is mirrored (flipped X) to match selfie view

**Design Decisions**:

- Title bar restriction prevents accidental drags
- Mirrored coordinates feel natural in selfie view
- Release pinch anywhere to "drop" the window

### Fallback Interactions

Embodied interactions are inherently less reliable than direct input. We provide fallbacks:

| Primary       | Fallback                     |
| ------------- | ---------------------------- |
| Smile capture | Spacebar or click red button |
| Pinch drag    | Mouse drag on title bar      |
| Filter toggle | E key or Effects button      |

## Household Object Extension (Future Work)

The current prototype focuses on body-based input, but the architecture supports extension to household objects:

### Potential Additions

1. **Sticky Note Detection**

   - Hold up a bright colored sticky note
   - Detected via color thresholding
   - Could trigger "party mode" (rapid filter cycling)

2. **Coffee Mug Trigger**

   - Detect specific object shape/color
   - "Cheers" gesture triggers capture
   - Social context: capturing coffee moments

3. **Book Cover Recognition**
   - Detect a specific book cover
   - Could unlock hidden filter sets
   - Gamification element

### Implementation Approach

These extensions would use:

- p5.js color thresholding for simple detection
- ml5 image classification for object recognition
- Blob detection for shape analysis

## User Experience Considerations

### Lighting Requirements

The ML models require adequate lighting:

- Works best with daylight or bright artificial light
- Front-lighting preferred over backlighting
- Consistent lighting reduces detection jitter

### Distance and Position

- Hand should be 1-3 feet from camera for pinch detection
- Face should fill roughly 30-50% of frame for best smile detection
- Direct camera facing improves accuracy

### Feedback Design

Users need to understand the system state:

- Status badges show hand/face tracking status
- Smile indicator shows detection progress
- Countdown provides capture timing
- Flash confirms capture moment

## Conclusion

This prototype demonstrates that meaningful embodied interaction is achievable with commodity hardware (a webcam) and accessible ML tools (ml5.js). By mapping natural human expressions and gestures to application controls, we create an experience that feels more intuitive and playful than traditional input methods.

The technical implementation prioritizes reliability through:

- Consecutive frame requirements (debouncing)
- Hysteresis (preventing state oscillation)
- Cooldowns (preventing unwanted repetition)
- Visual feedback (user understanding)

Future work could expand the vocabulary of recognized gestures and objects, creating richer embodied experiences.
