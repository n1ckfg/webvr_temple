/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 * @author n1ckfg / http://fox-gieg.com
 */

THREE.WasdControls = function(object, onError) {
	
	this.devices = [];
	this.devices.push(new MouseKeyboardPositionSensorVRDevice());
  	navigator.getVRDevices = this.getVRDevices.bind(this);
  	window.PositionSensorVRDevice = PositionSensorVRDevice;

	var scope = this;

	var vrInputs = [];

	function filterInvalidDevices(devices) {
		// Exclude Cardboard position sensor if Oculus exists.
		var oculusDevices = devices.filter(function(device) {
			return device.deviceName.toLowerCase().indexOf('oculus') !== - 1;
		});

		if (oculusDevices.length >= 1) {
			return devices.filter(function(device) {
				return device.deviceName.toLowerCase().indexOf('cardboard') === - 1;
			});
		} else {
			return devices;
		}
	}

	function gotVRDevices(devices) {
		devices = filterInvalidDevices(devices);
		for (var i = 0; i < devices.length; i ++) {
			if (devices[ i ] instanceof PositionSensorVRDevice) {
				vrInputs.push(devices[ i ]);
			}
		}
		if (onError) onError('HMD not available');
	}

	if (navigator.getVRDevices) {
		navigator.getVRDevices().then(gotVRDevices);
	}

	// the Rift SDK returns the position in meters
	// this scale factor allows the user to define how meters
	// are converted to scene units.

	this.scale = 1;

	this.update = function() {
		for (var i = 0; i < vrInputs.length; i ++) {
			var vrInput = vrInputs[ i ];
			var state = vrInput.getState();

			if (state.orientation !== null) {
				object.quaternion.copy(state.orientation);
			}

			if (state.position !== null) {
				//object.position.copy(state.position).multiplyScalar(scope.scale);
			}
		}
	};

	this.resetSensor = function() {
		for (var i = 0; i < vrInputs.length; i ++) {
			var vrInput = vrInputs[ i ];
			if (vrInput.resetSensor !== undefined) {
				vrInput.resetSensor();
			} else if (vrInput.zeroSensor !== undefined) {
				vrInput.zeroSensor();
			}
		}
	};

	this.zeroSensor = function() {
		console.warn('THREE.VRControls: .zeroSensor() is now .resetSensor().');
		this.resetSensor();
	};

	this.dispose = function() {
		vrInputs = [];
	};

	/*
	 * Copyright 2015 Google Inc. All Rights Reserved.
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	// How much to rotate per key stroke.
	var KEY_SPEED = 0.15;
	var KEY_ANIMATION_DURATION = 80;

	// How much to rotate for mouse events.
	var MOUSE_SPEED_X = 0.5;
	var MOUSE_SPEED_Y = 0.3;

	/**
	 * A virtual position sensor, implemented using keyboard and
	 * mouse APIs. This is designed as for desktops/laptops where no Device*
	 * events work.
	 */
	function MouseKeyboardPositionSensorVRDevice() {
	  this.deviceId = 'webvr-polyfill:mouse-keyboard';
	  this.deviceName = 'VR Position Device (webvr-polyfill:mouse-keyboard)';

	  // Attach to mouse and keyboard events.
	  window.addEventListener('keydown', this.onKeyDown_);
	  window.addEventListener('mousemove', this.onMouseMove_);
	  window.addEventListener('mousedown', this.onMouseDown_);
	  window.addEventListener('mouseup', this.onMouseUp_);

	  this.phi = 0;
	  this.theta = 0;

	  // Variables for keyboard-based rotation animation.
	  this.targetAngle = null;

	  // State variables for calculations.
	  this.euler = new THREE.Euler();
	  this.orientation = new THREE.Quaternion();

	  // Variables for mouse-based rotation.
	  this.rotateStart = new THREE.Vector2();
	  this.rotateEnd = new THREE.Vector2();
	  this.rotateDelta = new THREE.Vector2();
	}

	function VRDevice() {
	  this.hardwareUnitId = 'webvr-polyfill hardwareUnitId';
	  this.deviceId = 'webvr-polyfill deviceId';
	  this.deviceName = 'webvr-polyfill deviceName';
	}

	function PositionSensorVRDevice() {
	}

	PositionSensorVRDevice.prototype = new VRDevice();

	MouseKeyboardPositionSensorVRDevice.prototype = new PositionSensorVRDevice();

	/**
	 * Returns {orientation: {x,y,z,w}, position: null}.
	 * Position is not supported for parity with other PositionSensors.
	 */
	MouseKeyboardPositionSensorVRDevice.prototype.getState = function() {
	  this.euler.set(this.phi, this.theta, 0, 'YXZ');
	  this.orientation.setFromEuler(this.euler);

	  return {
	    hasOrientation: true,
	    orientation: this.orientation,
	    hasPosition: false,
	    position: null
	  }
	};

	MouseKeyboardPositionSensorVRDevice.prototype.onKeyDown_ = function(e) {
	  // Track WASD and arrow keys.
	  if (e.keyCode == 38) { // Up key.
	    this.animatePhi_(this.phi + KEY_SPEED);
	  } else if (e.keyCode == 39) { // Right key.
	    this.animateTheta_(this.theta - KEY_SPEED);
	  } else if (e.keyCode == 40) { // Down key.
	    this.animatePhi_(this.phi - KEY_SPEED);
	  } else if (e.keyCode == 37) { // Left key.
	    this.animateTheta_(this.theta + KEY_SPEED);
	  }
	};

	MouseKeyboardPositionSensorVRDevice.prototype.animateTheta_ = function(targetAngle) {
	  this.animateKeyTransitions_('theta', targetAngle);
	};

	MouseKeyboardPositionSensorVRDevice.prototype.animatePhi_ = function(targetAngle) {
	  // Prevent looking too far up or down.
	  targetAngle = Util.clamp(targetAngle, -Math.PI/2, Math.PI/2);
	  this.animateKeyTransitions_('phi', targetAngle);
	};

	/**
	 * Start an animation to transition an angle from one value to another.
	 */
	MouseKeyboardPositionSensorVRDevice.prototype.animateKeyTransitions_ = function(angleName, targetAngle) {
	  // If an animation is currently running, cancel it.
	  if (this.angleAnimation) {
	    clearInterval(this.angleAnimation);
	  }
	  var startAngle = this[angleName];
	  var startTime = new Date();
	  // Set up an interval timer to perform the animation.
	  this.angleAnimation = setInterval(function() {
	    // Once we're finished the animation, we're done.
	    var elapsed = new Date() - startTime;
	    if (elapsed >= KEY_ANIMATION_DURATION) {
	      this[angleName] = targetAngle;
	      clearInterval(this.angleAnimation);
	      return;
	    }
	    // Linearly interpolate the angle some amount.
	    var percent = elapsed / KEY_ANIMATION_DURATION;
	    this[angleName] = startAngle + (targetAngle - startAngle) * percent;
	  }.bind(this), 1000/60);
	};

	MouseKeyboardPositionSensorVRDevice.prototype.onMouseDown_ = function(e) {
	  this.rotateStart.set(e.clientX, e.clientY);
	  this.isDragging = true;
	};

	// Very similar to https://gist.github.com/mrflix/8351020
	MouseKeyboardPositionSensorVRDevice.prototype.onMouseMove_ = function(e) {
	  if (!this.isDragging && !this.isPointerLocked_()) {
	    return;
	  }
	  // Support pointer lock API.
	  if (this.isPointerLocked_()) {
	    var movementX = e.movementX || e.mozMovementX || 0;
	    var movementY = e.movementY || e.mozMovementY || 0;
	    this.rotateEnd.set(this.rotateStart.x - movementX, this.rotateStart.y - movementY);
	  } else {
	    this.rotateEnd.set(e.clientX, e.clientY);
	  }
	  // Calculate how much we moved in mouse space.
	  this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
	  this.rotateStart.copy(this.rotateEnd);

	  // Keep track of the cumulative euler angles.
	  var element = document.body;
	  this.phi += 2 * Math.PI * this.rotateDelta.y / element.clientHeight * MOUSE_SPEED_Y;
	  this.theta += 2 * Math.PI * this.rotateDelta.x / element.clientWidth * MOUSE_SPEED_X;

	  // Prevent looking too far up or down.
	  this.phi = Util.clamp(this.phi, -Math.PI/2, Math.PI/2);
	};

	MouseKeyboardPositionSensorVRDevice.prototype.onMouseUp_ = function(e) {
	  this.isDragging = false;
	};

	MouseKeyboardPositionSensorVRDevice.prototype.isPointerLocked_ = function() {
	  var el = document.pointerLockElement || document.mozPointerLockElement ||
	      document.webkitPointerLockElement;
	  return el !== undefined;
	};

	MouseKeyboardPositionSensorVRDevice.prototype.resetSensor = function() {
	  console.error('Not implemented yet.');
	};

};

THREE.WasdControls.prototype.getVRDevices = function() {
  var devices = this.devices;
  return new Promise(function(resolve, reject) {
    try {
      resolve(devices);
    } catch (e) {
      reject(e);
    }
  });
};