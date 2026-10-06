// Wires the gallery, the map and the polaroids together.
(function () {
  var backButton = document.getElementById("back-button");

  var cities = window.CITIES.map(function (city) {
    var copy = Object.assign({}, city);
    copy.unlocked = !!city.unlocked;
    copy.photos = [];
    return copy;
  });

  function findCity(id) {
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].id === id) return cities[i];
    }
    return null;
  }

  // Temporary: Tokyo's original hardcoded photos, until uploads replace them.
  var legacyCards = {
    meiji: [
      { angle: -12, photo: 'url("assets/meiji-photo-1.png")' },
      { angle: -3, photo: 'url("assets/meiji-photo-2.png")' },
      { angle: 9, photo: 'url("assets/meiji-photo-3.png")' },
    ],
    scramble: [
      { angle: -11, photo: 'url("assets/scramble-photo-1.png")' },
      { angle: 0, photo: 'url("assets/scramble-photo-2.png")' },
      { angle: 12, photo: 'url("assets/scramble-photo-3.png")' },
    ],
    sensoji: [
      { angle: -11, photo: 'url("assets/senso-photo-1.png")' },
      { angle: -2, photo: 'url("assets/senso-photo-2.png")' },
      { angle: 7, photo: 'url("assets/senso-photo-3.png")' },
      { angle: 13, photo: 'url("assets/senso-photo-4.png")' },
    ],
    cat: [
      { angle: -8, photo: 'url("assets/cat-photo-1.png")' },
      { angle: 9, photo: 'url("assets/cat-photo-2.png")' },
    ],
  };

  // ---- Screens ------------------------------------------------------------

  var openCityId = null;

  function showGallery() {
    openCityId = null;
    Polaroids.hide();
    DioramaMap.close();
    document.body.classList.remove("view-map");
    document.body.classList.add("view-gallery");
    Gallery.setActive(true);
  }

  function showMap(city) {
    if (!city || !city.unlocked) {
      showGallery();
      return;
    }
    openCityId = city.id;
    Gallery.goTo(Gallery.indexOf(city.id), false);
    Gallery.setActive(false);
    document.body.classList.add("is-opening");
    DioramaMap.open(city, function () {
      if (openCityId !== city.id) return;
      document.body.classList.remove("is-opening", "view-gallery");
      document.body.classList.add("view-map");
    });
  }

  // The URL hash mirrors the screen (#/tokyo), so the phone's back button
  // and browser history return to the gallery.
  function route() {
    var match = /^#\/(.+)$/.exec(location.hash);
    var city = match ? findCity(decodeURIComponent(match[1])) : null;
    if (city && city.unlocked) {
      showMap(city);
    } else {
      if (match) history.replaceState(null, "", location.pathname + location.search);
      showGallery();
    }
  }

  function openCity(city) {
    if (location.hash !== "#/" + city.id) {
      // Mark the entry so "back" can simply pop history.
      history.pushState({ fromGallery: true }, "", "#/" + city.id);
    }
    showMap(city);
  }

  function goBack() {
    if (history.state && history.state.fromGallery) {
      history.back();
    } else {
      history.replaceState(null, "", location.pathname + location.search);
      showGallery();
    }
  }

  backButton.addEventListener("click", goBack);
  window.addEventListener("popstate", route);
  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && openCityId) {
      if (Polaroids.isOpen()) {
        Polaroids.hide();
      } else {
        goBack();
      }
    }
  });

  // ---- Map interactions ---------------------------------------------------

  DioramaMap.onLandmark = function (city, key) {
    var cards = city.id === "tokyo" ? legacyCards[key] : null;
    if (cards && cards.length) {
      Polaroids.show(city.id + ":" + key, cards);
    }
  };

  DioramaMap.onEmptyTap = function () {
    Polaroids.hide();
  };

  // ---- Start --------------------------------------------------------------

  Gallery.init(cities, { onOpen: openCity });

  DioramaMap.preload(cities[0]);
  route();

  window.TravelApp = {
    cities: cities,
    findCity: findCity,
    openCity: openCity,
    showGallery: showGallery,
  };
})();
