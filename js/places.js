// Decides where a photo belongs, and names places that have no map.
//   Places.locate(photo, cities) -> { kind: "landmark", city, landmark }
//                                 | { kind: "city", city }
//                                 | { kind: "elsewhere" }
//                                 | { kind: "unplaced" }
//   Places.lookupName(lat, lng)  -> Promise of a place name (e.g. "Nara")
(function () {
  function distanceM(lat1, lng1, lat2, lng2) {
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLng = (lng2 - lng1) * toRad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) *
        Math.cos(lat2 * toRad) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function nearest(items, lat, lng, getPoint, getRadiusM) {
    var best = null;
    var bestDistance = Infinity;
    for (var i = 0; i < items.length; i += 1) {
      var point = getPoint(items[i]);
      var d = distanceM(lat, lng, point.lat, point.lng);
      if (d <= getRadiusM(items[i]) && d < bestDistance) {
        best = items[i];
        bestDistance = d;
      }
    }
    return best;
  }

  function locate(photo, cities) {
    if (photo.lat === null || photo.lng === null) return { kind: "unplaced" };

    var city = nearest(
      cities,
      photo.lat,
      photo.lng,
      function (c) {
        return c.center;
      },
      function (c) {
        return c.radiusKm * 1000;
      },
    );
    if (!city) return { kind: "elsewhere" };

    var landmark = nearest(
      city.landmarks || [],
      photo.lat,
      photo.lng,
      function (l) {
        return l;
      },
      function (l) {
        return l.radiusM;
      },
    );
    return landmark
      ? { kind: "landmark", city: city, landmark: landmark }
      : { kind: "city", city: city };
  }

  // Free reverse geocoding from OpenStreetMap's Nominatim. Its rules ask for
  // at most one request a second, so lookups are queued and cached.
  var cache = {};
  var queue = Promise.resolve();

  function lookupName(lat, lng) {
    var key = lat.toFixed(2) + "," + lng.toFixed(2);
    if (cache[key]) return cache[key];

    var fallback =
      Math.abs(lat).toFixed(2) + "°" + (lat < 0 ? "S" : "N") + " " +
      Math.abs(lng).toFixed(2) + "°" + (lng < 0 ? "W" : "E");
    var url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10" +
      "&accept-language=en&lat=" +
      lat +
      "&lon=" +
      lng;

    var result = queue
      .then(function () {
        return fetch(url);
      })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        var a = data.address || {};
        var place =
          a.city || a.town || a.village || a.municipality || a.county ||
          a.state || data.name;
        if (!place) return fallback;
        return a.country && a.country !== place ? place + ", " + a.country : place;
      })
      .catch(function () {
        return fallback;
      });

    queue = result.then(function () {
      return new Promise(function (resolve) {
        setTimeout(resolve, 1100);
      });
    });
    cache[key] = result;
    return result;
  }

  window.Places = { locate: locate, lookupName: lookupName, distanceM: distanceM };
})();
