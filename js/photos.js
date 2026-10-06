// Reads location + date from photos. Uploads and the sample trip both end up
// in PhotoReader.read(files), so they go through exactly the same logic.
//   PhotoReader.read(files)   -> Promise of [{ id, name, url, lat, lng, takenAt }]
//   PhotoReader.loadSample()  -> Promise of { album, files } from assets/sample/
//   PhotoReader.idFor(file)   -> the id a photo gets, to spot duplicates
(function () {
  var SAMPLE_DIR = "assets/sample/";

  function idFor(file) {
    return file.name + ":" + file.size + ":" + file.lastModified;
  }

  function readOne(file) {
    var record = {
      id: idFor(file),
      name: file.name,
      url: URL.createObjectURL(file),
      lat: null,
      lng: null,
      takenAt: null,
    };

    return exifr
      .parse(file, { gps: true })
      .then(function (meta) {
        if (!meta) return record;
        if (isFinite(meta.latitude) && isFinite(meta.longitude)) {
          record.lat = meta.latitude;
          record.lng = meta.longitude;
        }
        var date = meta.DateTimeOriginal || meta.CreateDate || meta.ModifyDate;
        if (date instanceof Date && !isNaN(date)) record.takenAt = date;
        return record;
      })
      .catch(function () {
        return record;
      });
  }

  // A few at a time, so a big batch doesn't choke a phone.
  function read(files) {
    files = Array.prototype.slice.call(files);
    var results = new Array(files.length);
    var next = 0;

    function worker() {
      if (next >= files.length) return Promise.resolve();
      var index = next++;
      return readOne(files[index]).then(function (record) {
        results[index] = record;
        return worker();
      });
    }

    var workers = [];
    for (var i = 0; i < Math.min(4, files.length); i += 1) workers.push(worker());
    return Promise.all(workers).then(function () {
      return results;
    });
  }

  function loadSample() {
    return fetch(SAMPLE_DIR + "manifest.json")
      .then(function (response) {
        return response.json();
      })
      .then(function (manifest) {
        var files = Promise.all(
          manifest.photos.map(function (name) {
            return fetch(SAMPLE_DIR + name)
              .then(function (response) {
                return response.blob();
              })
              .then(function (blob) {
                // Fixed lastModified so the same sample photo is recognised
                // as a duplicate if the button is pressed twice.
                return new File([blob], name, {
                  type: blob.type,
                  lastModified: 0,
                });
              });
          }),
        );
        return files.then(function (list) {
          return { album: manifest.album, files: list };
        });
      });
  }

  window.PhotoReader = { read: read, loadSample: loadSample, idFor: idFor };
})();
