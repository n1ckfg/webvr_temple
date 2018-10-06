"use strict";

var renderer, scene, camera, controls, clock, light, canvas;
var boxWidth, params, lastRender; // , manager, effect;

var sprites = [];
var colliders = [];

var isWalking = false;
var isFlying = false;
var flyingThreshold = 0.15;
var movingSpeed = 0;
var movingSpeedMax = 0.25;
var movingDelta = 0.02;
var floor = 0;
var gravity = 0.01;
var cameraGaze;

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvas = renderer.domElement;
    document.body.appendChild(canvas);
    window.addEventListener('resize', onResize, false);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    controls = new THREE.VRControls(camera);
    //effect = new THREE.VREffect(renderer);
    ///effect.setSize(window.innerWidth, window.innerHeight);

    clock = new THREE.Clock;

    params = {
        hideButton: false,
        isUndistorted: false
    };

    //manager = new WebVRManager(renderer, effect, params);

    lastRender = 0;

    setupPlayer();
}

function onResize() {
  // The delay ensures the browser has a chance to layout
  // the page and update the clientWidth/clientHeight.
  // This problem particularly crops up under iOS.
  if (!onResize.resizeDelay) {
    onResize.resizeDelay = setTimeout(function () {
      onResize.resizeDelay = null;
      console.log('Resizing to %s x %s.', window.innerWidth, window.innerHeight);
      //effect.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 250);
  }
}

function render(timestamp) {
    var delta = Math.min(timestamp - lastRender, 500);
    lastRender = timestamp;

    updatePlayer();
    controls.update();

    //manager.render(scene, camera, timestamp);
    renderer.render(scene, camera);
}

function setupControls() {
    window.addEventListener("touchstart", function(event) {
        isWalking = true;
    });

    window.addEventListener("touchend", function(event) {
        isWalking = false;
    })

    window.addEventListener("keydown", function(event) {
        if (getKeyCode() == 'w') isWalking = true;
    });

    window.addEventListener("keyup", function(event) {
        if (getKeyCode() == 'w') isWalking = false;
    });
}

function getKeyCode() {
    var k = event.charCode || event.keyCode;
    var c = String.fromCharCode(k).toLowerCase();
    return c;
}

function setupPlayer() {
    cameraGaze = new THREE.Object3D();
    cameraGaze.position.set(0, 0.1, -60);
    camera.add(cameraGaze);

    setupControls();
}

function updatePlayer() {
    if (camera.rotation.x > flyingThreshold) {
        isFlying = true;
    } else {
        isFlying = false;
    }

    var cameraPos = camera.position.clone();
    var targetPos = cameraPos.clone();
    var aimPos = cameraGaze.getWorldPosition();

    if (isWalking) {
        if (movingSpeed < movingSpeedMax) {
            movingSpeed += movingDelta;
        } else if (movingSpeed > movingSpeedMax) {
            movingSpeed = movingSpeedMax;
        }
    } else {
        if (movingSpeed > 0) {
            movingSpeed -= movingDelta;
        } else if (movingSpeed < 0) {
            movingSpeed = 0;
        }
    }

    if (movingSpeed > 0) {
        targetPos.x += ( aimPos.x - cameraPos.x ) * (movingSpeed / 1000);
        if (isFlying) targetPos.y += ( aimPos.y - cameraPos.y ) * (movingSpeed / 1000);
        targetPos.z += ( aimPos.z - cameraPos.z ) * (movingSpeed / 1000);

        camera.position.set(targetPos.x, targetPos.y, targetPos.z);
        camera.updateMatrixWorld();
        camera.lookAt(aimPos);
    }

    if (!isWalking && camera.position.y > floor) {
        camera.position.y -= gravity;
        if (camera.position.y < floor) camera.position.y = floor;
    }

    console.log(camera.rotation.x + " " + isFlying);
}

function spriteAnimator(texture, tilesHoriz, tilesVert, numTiles, tileDispDuration) {  
    this.tilesHorizontal = tilesHoriz;
    this.tilesVertical = tilesVert;

    this.numberOfTiles = numTiles;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; 
    texture.repeat.set( 1 / this.tilesHorizontal, 1 / this.tilesVertical );

    this.tileDisplayDuration = tileDispDuration;

    this.currentDisplayTime = 0;

    this.currentTile = 0;
        
    this.update = function( milliSec ) {
        this.currentDisplayTime += milliSec;
        while (this.currentDisplayTime > this.tileDisplayDuration) {
            this.currentDisplayTime -= this.tileDisplayDuration;
            this.currentTile++;
            if (this.currentTile == this.numberOfTiles)
                this.currentTile = 0;
            var currentColumn = this.currentTile % this.tilesHorizontal;
            texture.offset.x = currentColumn / this.tilesHorizontal;
            var currentRow = Math.floor( this.currentTile / this.tilesHorizontal );
            texture.offset.y = currentRow / this.tilesVertical;
        }
    };
}

function updateSprites() {
    var delta = clock.getDelta(); 
    for (var i=0; i<sprites.length; i++){
        sprites[i].update(1000 * delta);
    }
}