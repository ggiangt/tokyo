// The zoomable diorama (three.js plane). Same scene, lighting and controls as
// before, but the artwork and landmarks now come from the open city.
//   DioramaMap.open(city, onReady)  show a city's map
//   DioramaMap.close()              stop rendering (gallery is showing)
//   DioramaMap.preload(city)        start loading a city's artwork early
//   DioramaMap.onLandmark = function (city, landmarkKey) {}
//   DioramaMap.onEmptyTap = function (city) {}
//   DioramaMap.setPins(pins)        photo pins: [{ id, x, y, photo, count, isNew }]
//   DioramaMap.onPinTap = function (city, pin) {}
//   DioramaMap.pickSpot(city, taken) -> Promise of a random { x, y } on the art
(function () {
  var pinLayer = document.getElementById("pin-layer");
  var pins = [];
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2(-10, -10);
  var hoveredLandmark = null;
  var pressedKeys = {};
  var viewBounds = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  };
  var lastFrameTime = performance.now();
  var hasAppliedInitialView = false;
  var activeCity = null;
  var landmarkZones = [];
  var textures = {};
  var api = {};

  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();

  var aspect = window.innerWidth / window.innerHeight;
  var camSize = 10;
  var camera = new THREE.OrthographicCamera(
    -camSize * aspect,
    camSize * aspect,
    camSize,
    -camSize,
    0.1,
    100,
  );
  camera.position.set(0, 0, 18);
  camera.lookAt(0, 0, 0);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.panSpeed = 0.9;
  controls.screenSpacePanning = true;
  controls.minZoom = 0.8;
  controls.maxZoom = 3.6;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.update();

  var hemi = new THREE.HemisphereLight(0xffd7a8, 0xb7c0c8, 0.42);
  scene.add(hemi);

  var sun = new THREE.DirectionalLight(0xffb45c, 2.1);
  sun.position.set(-10, 6, 9);
  sun.target.position.set(1.2, -0.8, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 6;
  sun.shadow.blurSamples = 8;
  scene.add(sun);
  scene.add(sun.target);

  var textureLoader = new THREE.TextureLoader();

  var imagePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({
      color: 0xf2dcc4,
      transparent: true,
      alphaTest: 0.03,
      side: THREE.DoubleSide,
      roughness: 0.96,
      metalness: 0.0,
      emissive: 0x241406,
      emissiveIntensity: 0.08,
    }),
  );
  imagePlane.castShadow = true;
  imagePlane.receiveShadow = false;
  imagePlane.visible = false;
  scene.add(imagePlane);

  var shadowPad = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 48),
    new THREE.ShadowMaterial({ opacity: 0.32 }),
  );
  shadowPad.rotation.x = -Math.PI / 2;
  shadowPad.scale.set(1.18, 0.72, 1);
  shadowPad.position.set(0.85, -5.05, -0.15);
  shadowPad.receiveShadow = true;
  scene.add(shadowPad);

  // Loads (once) and caches each city's artwork.
  function loadTexture(city, onLoad) {
    var entry = textures[city.id];
    if (!entry) {
      entry = textures[city.id] = { ready: false, callbacks: [] };
      entry.texture = textureLoader.load(city.map, function () {
        entry.ready = true;
        var callbacks = entry.callbacks;
        entry.callbacks = [];
        for (var i = 0; i < callbacks.length; i += 1) {
          callbacks[i](entry.texture);
        }
      });
      entry.texture.encoding = THREE.sRGBEncoding;
    }

    if (onLoad) {
      if (entry.ready) {
        onLoad(entry.texture);
      } else {
        entry.callbacks.push(onLoad);
      }
    }
  }

  function showCityTexture(city, texture) {
    var aspectRatio = texture.image.width / texture.image.height;
    var displayHeight = 14;
    imagePlane.material.map = texture;
    imagePlane.material.needsUpdate = true;
    imagePlane.scale.set(displayHeight * aspectRatio, displayHeight, 1);
    imagePlane.position.set(0, 0, 0);
    imagePlane.visible = true;
    landmarkZones = city.landmarks || [];
    hasAppliedInitialView = false;
    updateViewBounds();
    applyInitialView();
  }

  function updateViewBounds() {
    if (!imagePlane.scale.x || !imagePlane.scale.y) {
      return;
    }

    var visibleWidth = (camera.right - camera.left) / camera.zoom;
    var visibleHeight = (camera.top - camera.bottom) / camera.zoom;
    var halfContentWidth = imagePlane.scale.x * 0.5;
    var halfContentHeight = imagePlane.scale.y * 0.5;

    viewBounds.minX = Math.min(0, visibleWidth * 0.5 - halfContentWidth);
    viewBounds.maxX = Math.max(0, halfContentWidth - visibleWidth * 0.5);
    viewBounds.minY = Math.min(0, visibleHeight * 0.5 - halfContentHeight);
    viewBounds.maxY = Math.max(0, halfContentHeight - visibleHeight * 0.5);
  }

  function clampCameraToBounds() {
    controls.target.x = THREE.MathUtils.clamp(
      controls.target.x,
      viewBounds.minX,
      viewBounds.maxX,
    );
    controls.target.y = THREE.MathUtils.clamp(
      controls.target.y,
      viewBounds.minY,
      viewBounds.maxY,
    );
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      viewBounds.minX,
      viewBounds.maxX,
    );
    camera.position.y = THREE.MathUtils.clamp(
      camera.position.y,
      viewBounds.minY,
      viewBounds.maxY,
    );
  }

  function applyInitialView() {
    if (hasAppliedInitialView || !imagePlane.scale.x || !imagePlane.scale.y) {
      return;
    }

    var fitZoomX = (camera.right - camera.left) / imagePlane.scale.x;
    var fitZoomY = (camera.top - camera.bottom) / imagePlane.scale.y;
    var coverZoom = Math.max(fitZoomX, fitZoomY) * 1.14;
    var view = (activeCity && activeCity.mapView) || { x: 0, y: 0 };

    camera.zoom = THREE.MathUtils.clamp(
      coverZoom,
      controls.minZoom,
      controls.maxZoom,
    );
    camera.updateProjectionMatrix();
    updateViewBounds();

    controls.target.set(view.x, view.y, 0);
    camera.position.set(view.x, view.y, 18);
    clampCameraToBounds();
    controls.update();
    hasAppliedInitialView = true;
  }

  function getHoveredLandmark(uv) {
    var bestMatch = null;
    var bestDistance = Infinity;

    for (var i = 0; i < landmarkZones.length; i += 1) {
      var zone = landmarkZones[i];
      var dx = uv.x - zone.x;
      var dy = uv.y - zone.y;
      var distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < zone.radius && distance < bestDistance) {
        bestMatch = zone.key;
        bestDistance = distance;
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    return null;
  }

  // Where on the artwork (0..1 uv) a screen point lands, or null.
  function artworkPointAt(clientX, clientY) {
    var ndc = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObject(imagePlane);
    return hits.length > 0 ? hits[0].uv : null;
  }

  function updatePointer(event) {
    if (event.pointerType === "touch") {
      return;
    }
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  renderer.domElement.addEventListener("pointermove", updatePointer);
  renderer.domElement.addEventListener("pointerleave", function () {
    pointer.set(-10, -10);
    hoveredLandmark = null;
    document.body.classList.remove("is-interactive-hover");
  });
  window.addEventListener("keydown", function (event) {
    if (activeCity && event.key.indexOf("Arrow") === 0) {
      pressedKeys[event.key] = true;
      event.preventDefault();
    }
  });
  window.addEventListener("keyup", function (event) {
    if (event.key.indexOf("Arrow") === 0) {
      pressedKeys[event.key] = false;
      if (activeCity) {
        event.preventDefault();
      }
    }
  });

  // A tap is a press + release that barely moved and used one finger, so
  // dragging to pan or pinching never opens a landmark by accident.
  var tap = null;
  var activePointers = 0;
  renderer.domElement.addEventListener("pointerdown", function (event) {
    activePointers += 1;
    tap =
      activePointers === 1
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null;
  });
  function endPointer(event) {
    activePointers = Math.max(0, activePointers - 1);
    if (!tap || tap.id !== event.pointerId || event.type !== "pointerup") {
      tap = null;
      return;
    }
    var moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
    tap = null;
    if (moved > 8 || !activeCity) {
      return;
    }
    handleTap(event.clientX, event.clientY);
  }
  renderer.domElement.addEventListener("pointerup", endPointer);
  renderer.domElement.addEventListener("pointercancel", endPointer);
  // Taps are handled above; stop the browser's follow-up click, which would
  // otherwise land on the polaroids that just opened and close them again.
  renderer.domElement.addEventListener(
    "touchend",
    function (event) {
      event.preventDefault();
    },
    { passive: false },
  );

  function handleTap(clientX, clientY) {
    var pin = pinAt(clientX, clientY);
    if (pin && pin.landmark) {
      if (api.onLandmark) api.onLandmark(activeCity, pin.landmark);
      return;
    }
    if (pin) {
      if (api.onPinTap) api.onPinTap(activeCity, pin);
      return;
    }

    var uv = artworkPointAt(clientX, clientY);
    var key = uv ? getHoveredLandmark(uv) : null;

    if (key) {
      if (api.onLandmark) api.onLandmark(activeCity, key);
      return;
    }

    if (api.onEmptyTap) api.onEmptyTap(activeCity);
  }

  // ---- Photo pins ---------------------------------------------------------
  // Pins are HTML on top of the canvas. Each frame they're moved to where
  // their artwork position lands on screen, so they follow pan and zoom.

  var projected = new THREE.Vector3();

  function artworkToScreen(x, y) {
    projected.set(
      (x - 0.5) * imagePlane.scale.x,
      (y - 0.5) * imagePlane.scale.y,
      0,
    );
    projected.project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function updatePins() {
    for (var i = 0; i < pins.length; i += 1) {
      var screen = artworkToScreen(pins[i].x, pins[i].y);
      pins[i].screen = screen;
      pins[i].el.style.transform =
        "translate3d(" + screen.x + "px, " + screen.y + "px, 0)";
    }
  }

  // The pin under a screen point (with a little slack for fingers).
  function pinAt(clientX, clientY) {
    var slack = 8;
    for (var i = pins.length - 1; i >= 0; i -= 1) {
      var box = pins[i].card.getBoundingClientRect();
      if (
        clientX >= box.left - slack &&
        clientX <= box.right + slack &&
        clientY >= box.top - slack &&
        clientY <= box.bottom + slack
      ) {
        return pins[i];
      }
    }
    return null;
  }

  function setPins(list) {
    pinLayer.innerHTML = "";
    pins = list.map(function (pin, index) {
      var el = document.createElement("div");
      el.className = "map-pin" + (pin.isNew ? " is-new" : "");
      el.innerHTML =
        '<div class="map-pin-card"><div class="map-pin-photo"></div></div>' +
        (pin.count > 1 ? '<span class="map-pin-count"></span>' : "");
      var card = el.querySelector(".map-pin-card");
      var angle = ((index * 37) % 15) - 7;
      card.style.setProperty("--settle-angle", angle + "deg");
      card.style.setProperty("--start-angle", angle - 4 + "deg");
      card.style.setProperty("--overshoot-angle", angle + 3 + "deg");
      card.style.setProperty("--delay", (pin.delay || 0) + "ms");
      el.querySelector(".map-pin-photo").style.backgroundImage =
        'url("' + pin.photo + '")';
      if (pin.count > 1) {
        el.querySelector(".map-pin-count").textContent = String(pin.count);
      }
      pinLayer.appendChild(el);
      return Object.assign({}, pin, { el: el, card: card });
    });
    updatePins();
  }

  // Random spot on the painted part of the artwork: skips transparent pixels,
  // the dark drop shadow, landmark areas and spots already taken.
  var alphaMaps = {};

  function getAlphaMap(city, texture) {
    if (alphaMaps[city.id]) return alphaMaps[city.id];
    var size = 200;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.round(
      (size * texture.image.height) / texture.image.width,
    );
    var context = canvas.getContext("2d");
    context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
    alphaMaps[city.id] = {
      width: canvas.width,
      height: canvas.height,
      data: context.getImageData(0, 0, canvas.width, canvas.height).data,
    };
    return alphaMaps[city.id];
  }

  function isOpenGround(map, x, y) {
    var px = Math.floor(x * map.width);
    var py = Math.floor((1 - y) * map.height);
    var i = (py * map.width + px) * 4;
    var d = map.data;
    var brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
    return d[i + 3] > 245 && brightness > 90;
  }

  function pickSpot(city, taken) {
    taken = taken || [];
    return new Promise(function (resolve) {
      loadTexture(city, function (texture) {
        var map = getAlphaMap(city, texture);
        var landmarks = city.landmarks || [];
        var fallback = { x: 0.5, y: 0.5 };

        for (var attempt = 0; attempt < 400; attempt += 1) {
          var x = 0.12 + Math.random() * 0.76;
          var y = 0.2 + Math.random() * 0.65;
          if (!isOpenGround(map, x, y)) continue;
          fallback = { x: x, y: y };

          var clear = true;
          for (var i = 0; i < landmarks.length && clear; i += 1) {
            clear =
              Math.hypot(x - landmarks[i].x, y - landmarks[i].y) >
              landmarks[i].radius * 0.85;
          }
          for (var j = 0; j < taken.length && clear; j += 1) {
            clear = Math.hypot(x - taken[j].x, y - taken[j].y) > 0.06;
          }
          if (clear) {
            resolve({ x: x, y: y });
            return;
          }
        }
        resolve(fallback);
      });
    });
  }

  window.addEventListener("resize", function () {
    aspect = window.innerWidth / window.innerHeight;
    camera.left = -camSize * aspect;
    camera.right = camSize * aspect;
    camera.top = camSize;
    camera.bottom = -camSize;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateViewBounds();
    if (hasAppliedInitialView) {
      clampCameraToBounds();
      controls.update();
    } else {
      applyInitialView();
    }
  });

  function animate() {
    requestAnimationFrame(animate);
    var now = performance.now();
    var delta = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    if (!activeCity) {
      return;
    }

    var keyboardPanSpeed = 4.6 / camera.zoom;
    var moveX = 0;
    var moveY = 0;

    if (pressedKeys.ArrowLeft) {
      moveX -= keyboardPanSpeed * delta;
    }
    if (pressedKeys.ArrowRight) {
      moveX += keyboardPanSpeed * delta;
    }
    if (pressedKeys.ArrowUp) {
      moveY += keyboardPanSpeed * delta;
    }
    if (pressedKeys.ArrowDown) {
      moveY -= keyboardPanSpeed * delta;
    }

    if (moveX || moveY) {
      controls.target.x += moveX;
      controls.target.y += moveY;
      camera.position.x += moveX;
      camera.position.y += moveY;
    }

    controls.target.z = 0;
    camera.position.z = 18;
    updateViewBounds();
    clampCameraToBounds();

    controls.update();

    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObject(imagePlane);
    hoveredLandmark = hits.length > 0 ? getHoveredLandmark(hits[0].uv) : null;
    var hoveredPin = pointer.x > -2 ? pinAt(
      (pointer.x * 0.5 + 0.5) * window.innerWidth,
      (-pointer.y * 0.5 + 0.5) * window.innerHeight,
    ) : null;
    document.body.classList.toggle(
      "is-interactive-hover",
      !!hoveredLandmark || !!hoveredPin,
    );

    renderer.render(scene, camera);
    updatePins();
  }

  animate();

  api.open = function (city, onReady) {
    activeCity = city;
    loadTexture(city, function (texture) {
      if (activeCity !== city) {
        return;
      }
      showCityTexture(city, texture);
      renderer.render(scene, camera);
      if (onReady) onReady();
    });
  };

  api.close = function () {
    activeCity = null;
    pressedKeys = {};
    pointer.set(-10, -10);
    hoveredLandmark = null;
    document.body.classList.remove("is-interactive-hover");
  };

  api.setPins = setPins;
  api.pickSpot = pickSpot;

  api.preload = function (city) {
    loadTexture(city);
  };

  window.DioramaMap = api;
})();
