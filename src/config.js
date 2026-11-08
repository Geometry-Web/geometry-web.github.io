/**
 * Geometry Web — global configuration and gameplay constants.
 *
 * This is an ORIGINAL implementation. The numeric values below are our own
 * tuning (inspired by the feel of the genre), not values extracted from the
 * Geometry Dash binary.
 */
window.GD = window.GD || {};

GD.C = {
    // Design resolution (world coordinates are in these units).
    designW: 960,
    designH: 540,

    // Ground: the playable floor is a horizontal line at y = groundY.
    groundY: 60,

    // Player dimensions (square side for cube/robot, diameter for ball/spider).
    playerSize: 30,
    shipWidth: 42,
    shipHeight: 24,

    // Core movement.
    baseSpeed: 320,       // horizontal auto-scroll speed (px/s)
    speedMultiplier: 1.0, // multiplied by speed portals (0.5x / 1x / 2x / 3x / 4x)

    // Cube physics (units: px, px/s, px/s^2; y increases upward).
    gravity: 3000,        // downward acceleration magnitude
    jumpVelocity: 780,    // initial upward velocity of a jump

    // Ship physics.
    shipGravity: 2200,
    shipThrust: 3600,     // upward acceleration while holding (net +1400 held)

    // Ball physics.
    ballGravity: 3000,
    ballFlipVelocity: 700, // impulse applied when flipping gravity

    // UFO / robot / spider / swing physics.
    ufoJumpVelocity: 640,     // small mid-air hop impulse
    robotMaxCharge: 0.4,      // seconds to full charge
    robotJumpMin: 420,        // lowest release jump
    robotJumpMax: 1150,       // full-charge jump
    swingGravity: 2400,
    swingFlipVelocity: 640,

    // Size portal multipliers.
    sizeSmall: 0.72,
    sizeBig: 1.32,

    // Rotation of the cube while airborne (degrees over a full jump arc).
    jumpRotation: 180,

    // Input keys.
    keyJump: [32, 38, 87],   // space, up, w

    // Colors (r,g,b 0..255). Original palette.
    colorBg: [96, 150, 245],
    colorBgTop: [106, 158, 248],
    colorBgBottom: [56, 100, 214],
    colorParallaxFar: [44, 78, 168],
    colorParallaxNear: [34, 60, 140],
    colorGround: [30, 60, 120],
    colorGroundTop: [30, 48, 104],
    colorGroundBottom: [16, 26, 60],
    colorGroundLine: [255, 255, 255],
    colorPlayer: [96, 255, 122],
    colorPlayerBorder: [255, 255, 255],
    colorPlayerGlow: [110, 255, 150],
    colorPlayerAccent: [255, 255, 255],
    colorShip: [120, 205, 255],
    colorBall: [255, 210, 90],
    colorBlock: [240, 242, 250],
    colorBlockBorder: [58, 68, 98],
    colorSpike: [240, 243, 252],
    colorSpikeBorder: [66, 76, 106],
    colorOrbJump: [255, 224, 60],
    colorOrbGravity: [236, 100, 246],
    colorPadJump: [255, 205, 60],
    colorPadGravity: [250, 145, 246],
    colorPortalShip: [120, 224, 246],
    colorPortalCube: [124, 246, 144],
    colorPortalGravity: [214, 210, 70],
    colorCoin: [255, 224, 90],
    colorFinish: [124, 255, 164],

    // Gameplay.
    deathFlashTime: 0.4,   // seconds before auto-restart after death
    restartDelay: 0.55,
    maxCameraLookahead: 320,

    // Storage keys.
    saveKeyLevels: 'gdweb_custom_levels',
    saveKeyProgress: 'gdweb_progress',

    // Original Geometry Dash asset integration (personal, local use).
    // Set to the served path of your GD Resources folder, e.g. '../Resources/'
    // when serving the E:\GDWEB folder. Leave '' to use built-in art.
    assetsRoot: '',
};

// Player mode enum (shared with the C++ runtime / WASM ABI).
GD.Mode = {
    CUBE: 0,
    SHIP: 1,
    BALL: 2,
    UFO: 3,
    WAVE: 4,
    ROBOT: 5,
    SPIDER: 6,
    SWING: 7
};
