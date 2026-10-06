// Wires the gallery, the map and the polaroids together, and decides where
// new photos go.
(function () {
  var backButton = document.getElementById("back-button");

  var cities = window.CITIES.map(function (city) {
    var copy = Object.assign({}, city);
    copy.unlocked = !!city.unlocked;
    copy.photos = [];
    return copy;
  });
  var newPhotoIds = {};

  function findCity(id) {
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].id === id) return cities[i];
    }
    return null;
  }

  function plural(count, word) {
    return count + " " + word + (count === 1 ? "" : "s");
  }

  // ---- Polaroid cards -----------------------------------------------------

  var cardAngles = [-11, -3, 8, 12, -7, 4, -9, 10];

  function formatDate(date) {
    return date
      ? date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
  }

  function byDate(a, b) {
    return (a.takenAt || 0) - (b.takenAt || 0);
  }

  function toCards(photos, captionFor) {
    return photos
      .slice()
      .sort(byDate)
      .map(function (photo, i) {
        return {
          photo: 'url("' + photo.url + '")',
          angle: cardAngles[i % cardAngles.length],
          caption: captionFor(photo),
        };
      });
  }

  function dateCaption(photo) {
    return formatDate(photo.takenAt);
  }

  // ---- Screens ------------------------------------------------------------

  var openCityId = null;

  function showGallery() {
    openCityId = null;
    Polaroids.hide();
    DioramaMap.close();
    document.body.classList.remove("view-map", "is-opening");
    document.body.classList.add("view-gallery");
    Gallery.setActive(true);
  }

  // onSettled runs once the map is showing and any new pins have popped in.
  function showMap(city, onSettled) {
    if (!city || !city.unlocked) {
      showGallery();
      return;
    }
    openCityId = city.id;
    Polaroids.hide();
    Gallery.goTo(Gallery.indexOf(city.id), false);
    Gallery.setActive(false);
    document.body.classList.add("is-opening");
    DioramaMap.setPins([]);
    DioramaMap.open(city, function () {
      if (openCityId !== city.id) return;
      document.body.classList.remove("is-opening", "view-gallery");
      document.body.classList.add("view-map");
      var popTime = showPins(city);
      if (onSettled) setTimeout(onSettled, popTime + 900);
    });
  }

  // The URL hash mirrors the screen (#/tokyo), so the phone's back button
  // and browser history return to the gallery. Some embedded viewers refuse
  // history changes; the app then just switches screens without them.
  function clearHash() {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (error) {}
  }

  function route() {
    var match = /^#\/(.+)$/.exec(location.hash);
    var city = match ? findCity(decodeURIComponent(match[1])) : null;
    if (city && city.unlocked) {
      showMap(city);
    } else {
      if (match) clearHash();
      showGallery();
    }
  }

  function openCity(city, onSettled) {
    if (location.hash !== "#/" + city.id) {
      try {
        // Mark the entry so "back" can simply pop history.
        history.pushState({ fromGallery: true }, "", "#/" + city.id);
      } catch (error) {}
    }
    showMap(city, onSettled);
  }

  function goBack() {
    if (history.state && history.state.fromGallery) {
      history.back();
    } else {
      clearHash();
      showGallery();
    }
  }

  backButton.addEventListener("click", goBack);
  window.addEventListener("popstate", route);
  window.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (Polaroids.isOpen()) {
      Polaroids.hide();
    } else if (openCityId) {
      goBack();
    }
  });

  // ---- Map: pins and taps -------------------------------------------------

  // One pin per landmark with photos (showing the newest), plus one pin per
  // photo that landed on a random spot. New pins pop in one after another.
  function showPins(city) {
    var pins = [];
    var newCount = 0;

    function delayFor(isNew) {
      if (!isNew) return 0;
      newCount += 1;
      return 350 + (newCount - 1) * 260;
    }

    city.landmarks.forEach(function (landmark) {
      var photos = city.photos
        .filter(function (photo) {
          return photo.landmarkKey === landmark.key;
        })
        .sort(byDate);
      if (!photos.length) return;
      var isNew = photos.some(function (photo) {
        return newPhotoIds[photo.id];
      });
      pins.push({
        id: "landmark:" + landmark.key,
        landmark: landmark.key,
        x: landmark.x,
        y: landmark.y,
        photo: photos[photos.length - 1].url,
        count: photos.length,
        isNew: isNew,
        delay: delayFor(isNew),
      });
    });

    city.photos.forEach(function (photo) {
      if (!photo.spot) return;
      var isNew = !!newPhotoIds[photo.id];
      pins.push({
        id: photo.id,
        photoId: photo.id,
        x: photo.spot.x,
        y: photo.spot.y,
        photo: photo.url,
        count: 1,
        isNew: isNew,
        delay: delayFor(isNew),
      });
    });

    DioramaMap.setPins(pins);

    pins.forEach(function (pin) {
      if (pin.isNew) {
        setTimeout(function () {
          if (openCityId === city.id) Effects.playPaperSound();
        }, pin.delay + 120);
      }
    });
    city.photos.forEach(function (photo) {
      delete newPhotoIds[photo.id];
    });
    return newCount ? 350 + newCount * 260 : 0;
  }

  DioramaMap.onLandmark = function (city, key) {
    var landmark = city.landmarks.filter(function (l) {
      return l.key === key;
    })[0];
    var photos = city.photos.filter(function (photo) {
      return photo.landmarkKey === key;
    });
    if (!photos.length) {
      Notice.toast("No photos at " + landmark.name + " yet.");
      return;
    }
    Polaroids.show(city.id + ":" + key, toCards(photos, dateCaption));
  };

  DioramaMap.onPinTap = function (city, pin) {
    var photo = city.photos.filter(function (p) {
      return p.id === pin.photoId;
    })[0];
    if (photo) Polaroids.show("photo:" + photo.id, toCards([photo], dateCaption));
  };

  DioramaMap.onEmptyTap = function () {
    Polaroids.hide();
  };

  // ---- Placing new photos -------------------------------------------------

  // Photos with no location, or from somewhere with no map yet, go to a
  // random spot on one of the open maps.
  function randomOpenCity() {
    var open = cities.filter(function (city) {
      return city.unlocked;
    });
    return open[Math.floor(Math.random() * open.length)];
  }

  function placePhotos(photos) {
    var touched = [];
    var far = [];
    var needSpots = [];

    photos.forEach(function (photo) {
      var where = Places.locate(photo, cities);
      var city = where.city;
      if (where.kind === "far" || where.kind === "unknown") {
        if (where.kind === "far") far.push(photo);
        city = randomOpenCity();
      }
      photo.landmarkKey = where.landmark ? where.landmark.key : null;
      photo.spot = null;
      city.photos.push(photo);
      newPhotoIds[photo.id] = true;
      if (touched.indexOf(city) < 0) touched.push(city);
      if (!where.landmark) needSpots.push({ photo: photo, city: city });
    });

    // Random spots one at a time, so photos don't pile on the same place.
    var spotsDone = needSpots.reduce(function (chain, item) {
      return chain.then(function () {
        var taken = item.city.photos
          .filter(function (p) {
            return p.spot;
          })
          .map(function (p) {
            return p.spot;
          });
        return DioramaMap.pickSpot(item.city, taken).then(function (spot) {
          item.photo.spot = spot;
        });
      });
    }, Promise.resolve());

    return spotsDone.then(function () {
      return { cities: touched, far: far };
    });
  }

  // "This is from Paris, France. That map doesn't exist yet."
  function announceFarPlaces(photos) {
    var groups = {};
    photos.forEach(function (photo) {
      var key = photo.lat.toFixed(1) + "," + photo.lng.toFixed(1);
      (groups[key] = groups[key] || []).push(photo);
    });

    Object.keys(groups).forEach(function (key) {
      var photo = groups[key][0];
      Places.lookupName(photo.lat, photo.lng).then(function (place) {
        Notice.toast(
          "This is from " + place + ". That map doesn't exist yet.",
          { duration: 8000 },
        );
      });
    });
  }

  function handleNewPhotos(photos, duplicates) {
    if (!photos.length) {
      Notice.toast(
        duplicates ? "Those photos are already here." : "No photos found.",
      );
      return Promise.resolve();
    }

    return placePhotos(photos).then(function (result) {
      Gallery.update();
      if (result.far.length) announceFarPlaces(result.far);

      var firstOpen = result.cities.filter(function (city) {
        return city.unlocked;
      })[0];
      var locked = result.cities.filter(function (city) {
        return !city.unlocked;
      });
      // Show the open city's new pins first, then offer the unlocks.
      if (firstOpen) {
        openCity(firstOpen, function () {
          queueUnlocks(locked);
        });
      } else {
        queueUnlocks(locked);
      }
    });
  }

  // ---- Unlocking cities ---------------------------------------------------

  var unlockQueue = [];
  var unlocking = false;

  function queueUnlocks(list) {
    list.forEach(function (city) {
      if (!city.unlocked && unlockQueue.indexOf(city) < 0) {
        unlockQueue.push(city);
      }
    });
    nextUnlock();
  }

  function nextUnlock() {
    if (unlocking || !unlockQueue.length) return;
    unlocking = true;
    var city = unlockQueue.shift();

    Notice.unlockPrompt(city, city.photos.length).then(function (yes) {
      if (!yes) {
        Gallery.update();
        unlocking = false;
        nextUnlock();
        return;
      }

      city.unlocked = true;
      var wasOnMap = !!openCityId;
      if (wasOnMap) goBack();
      setTimeout(function () {
        Gallery.reveal(city.id, function () {
          unlocking = false;
          nextUnlock();
        });
      }, wasOnMap ? 420 : 0);
    });
  }

  // ---- Adding photos ------------------------------------------------------
  // "Try with my trip" and "Or upload your own" both end up in addFiles().

  var tripButton = document.getElementById("trip-button");
  var uploadLink = document.getElementById("upload-link");
  var uploadInput = document.getElementById("upload-input");
  var seenPhotoIds = {};
  var busy = false;

  function setBusy(isBusy) {
    busy = isBusy;
    tripButton.disabled = isBusy;
    uploadLink.disabled = isBusy;
    tripButton.textContent = isBusy ? "Opening photos…" : "Try with my trip";
  }

  function addFiles(files) {
    if (busy || !files.length) return Promise.resolve();
    setBusy(true);
    return PhotoReader.read(files)
      .then(function (records) {
        var fresh = records.filter(function (record) {
          if (seenPhotoIds[record.id]) {
            URL.revokeObjectURL(record.url);
            return false;
          }
          seenPhotoIds[record.id] = true;
          return true;
        });
        return handleNewPhotos(fresh, records.length - fresh.length);
      })
      .catch(function (error) {
        console.error(error);
        Notice.toast("Sorry, those photos couldn't be read.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  // "Try with my trip" opens a mock Photos window with the sample trip, so
  // you still choose which photos to add.
  tripButton.addEventListener("click", function () {
    if (busy) return;
    setBusy(true);
    PhotoReader.loadSample()
      .then(function (sample) {
        return PhotoPicker.open({
          album: sample.album,
          files: sample.files,
          isAdded: function (file) {
            return !!seenPhotoIds[PhotoReader.idFor(file)];
          },
          onAdd: addFiles,
        });
      })
      .catch(function (error) {
        console.error(error);
        Notice.toast("Couldn't load the sample trip.");
      })
      .then(function () {
        setBusy(false);
      });
  });

  uploadLink.addEventListener("click", function () {
    uploadInput.click();
  });
  uploadInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(uploadInput.files);
    uploadInput.value = "";
    addFiles(files);
  });

  // ---- Start --------------------------------------------------------------

  Gallery.init(cities, {
    onOpen: function (city) {
      openCity(city);
    },
    // A locked city with photos waiting (after "Not now") asks again.
    onLockedTap: function (city) {
      if (city.photos.length) queueUnlocks([city]);
    },
  });
  DioramaMap.preload(cities[0]);
  route();

  window.TravelApp = {
    cities: cities,
    findCity: findCity,
    openCity: openCity,
    showGallery: showGallery,
  };
})();
