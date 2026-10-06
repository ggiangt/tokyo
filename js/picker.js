// A mock Apple Photos window for choosing which sample photos to add.
//   PhotoPicker.open({ album, files, isAdded(file), onAdd(files) })
// Photos are grouped by day and place, like Photos' library view. Photos
// already on a map show as "Added" and can't be picked again.
(function () {
  var root = null;
  var records = [];
  var selected = {};
  var options = {};

  var icons = {
    library:
      '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="m4 16 4.5-4.5 3.5 3.5 2.5-2.5L20 18"/><circle cx="15.5" cy="8.5" r="1.5"/>',
    recents:
      '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    favourites:
      '<path d="M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 2.5C19 14.6 12 19 12 19z"/>',
    album:
      '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M7 4.5h10"/>',
  };

  function icon(name) {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + "</svg>"
    );
  }

  function formatDay(date) {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function dateRange(list) {
    var dates = list
      .map(function (r) {
        return r.takenAt;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return a - b;
      });
    if (!dates.length) return "";
    var first = dates[0];
    var last = dates[dates.length - 1];
    var end = last.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (first.toDateString() === last.toDateString()) return end;
    return first.getDate() + "–" + end;
  }

  // Day + place sections, oldest first; photos without a date go last.
  function groupRecords(list) {
    var sorted = list.slice().sort(function (a, b) {
      if (!a.takenAt) return 1;
      if (!b.takenAt) return -1;
      return a.takenAt - b.takenAt;
    });
    var groups = [];
    sorted.forEach(function (record) {
      var where = Places.locate(record, window.CITIES);
      var place = where.city ? where.city.name : "";
      var day = record.takenAt ? formatDay(record.takenAt) : "No date";
      var key = day + "|" + place;
      var last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        last = { key: key, day: day, place: place, records: [] };
        groups.push(last);
      }
      last.records.push(record);
    });
    return groups;
  }

  function selectedRecords() {
    return records.filter(function (r) {
      return selected[r.id];
    });
  }

  function available() {
    return records.filter(function (r) {
      return !r.added;
    });
  }

  function refresh() {
    var count = selectedRecords().length;
    var addButton = root.querySelector(".picker-add");
    addButton.disabled = !count;
    addButton.textContent = count
      ? "Add " + count + (count === 1 ? " Photo" : " Photos")
      : "Add";
    root.querySelector(".picker-count").textContent = count
      ? count + (count === 1 ? " photo" : " photos") + " selected"
      : "Tap photos to choose them";
    var allPicked = available().length && count === available().length;
    root.querySelector(".picker-select-all").textContent = allPicked
      ? "Deselect All"
      : "Select All";
    root.querySelectorAll(".picker-thumb").forEach(function (thumb) {
      var on = !!selected[records[thumb.dataset.index].id];
      thumb.classList.toggle("is-selected", on);
      thumb.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function build() {
    var groups = groupRecords(records);
    var html =
      '<div class="picker-window" role="dialog" aria-modal="true" aria-label="Choose photos" tabindex="-1">' +
      '<header class="picker-titlebar">' +
      '<div class="picker-lights">' +
      '<button class="picker-light picker-light--close" type="button" aria-label="Close"></button>' +
      '<span class="picker-light picker-light--min"></span>' +
      '<span class="picker-light picker-light--max"></span>' +
      "</div>" +
      '<div class="picker-titlebar-title">Photos</div>' +
      "</header>" +
      '<div class="picker-body">' +
      '<nav class="picker-sidebar" aria-hidden="true">' +
      '<p class="picker-sidebar-label">Photos</p>' +
      '<div class="picker-sidebar-item">' + icon("library") + "Library</div>" +
      '<div class="picker-sidebar-item">' + icon("recents") + "Recents</div>" +
      '<div class="picker-sidebar-item">' + icon("favourites") + "Favourites</div>" +
      '<p class="picker-sidebar-label">Albums</p>' +
      '<div class="picker-sidebar-item is-active">' + icon("album") + '<span class="picker-album-name"></span></div>' +
      "</nav>" +
      '<section class="picker-main">' +
      '<div class="picker-toolbar">' +
      '<div class="picker-heading"><h2 class="picker-album-name"></h2><p class="picker-album-meta"></p></div>' +
      '<button class="picker-select-all" type="button">Select All</button>' +
      "</div>" +
      '<div class="picker-scroll">';

    groups.forEach(function (group, groupIndex) {
      html +=
        '<div class="picker-group">' +
        '<h3 class="picker-group-title" data-group="' + groupIndex + '"></h3>' +
        '<div class="picker-grid">';
      group.records.forEach(function (record) {
        html +=
          '<button class="picker-thumb' + (record.added ? " is-added" : "") +
          '" type="button" data-index="' + records.indexOf(record) + '"' +
          (record.added ? " disabled" : "") + ' aria-pressed="false">' +
          '<img alt="" draggable="false">' +
          '<span class="picker-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 12.5 3.2 3.2L17 9"/></svg></span>' +
          (record.added ? '<span class="picker-added">Added</span>' : "") +
          "</button>";
      });
      html += "</div></div>";
    });

    html +=
      "</div></section></div>" +
      '<footer class="picker-footer">' +
      '<span class="picker-count"></span>' +
      '<div class="picker-buttons">' +
      '<button class="picker-cancel" type="button">Cancel</button>' +
      '<button class="picker-add" type="button" disabled>Add</button>' +
      "</div></footer></div>";

    root.innerHTML = html;

    // Text and image sources set separately so file names can't break markup.
    root.querySelectorAll(".picker-album-name").forEach(function (el) {
      el.textContent = options.album || "Recents";
    });
    root.querySelector(".picker-album-meta").textContent =
      [dateRange(records), records.length + " photos"].filter(Boolean).join(" · ");
    groups.forEach(function (group, groupIndex) {
      var title = root.querySelector('[data-group="' + groupIndex + '"]');
      title.textContent = group.place || group.day;
      if (group.place) {
        var day = document.createElement("span");
        day.textContent = group.day;
        title.appendChild(day);
      }
    });
    root.querySelectorAll(".picker-thumb").forEach(function (thumb) {
      var record = records[thumb.dataset.index];
      var img = thumb.querySelector("img");
      img.src = record.url;
      thumb.setAttribute("aria-label", record.name);
    });
  }

  function close() {
    if (!root) return;
    var closing = root;
    root = null;
    closing.classList.remove("is-open");
    window.removeEventListener("keydown", onKey, true);
    setTimeout(function () {
      closing.remove();
      records.forEach(function (r) {
        URL.revokeObjectURL(r.url);
      });
      records = [];
    }, 220);
  }

  function add() {
    var files = selectedRecords().map(function (r) {
      return r.file;
    });
    if (!files.length) return;
    var onAdd = options.onAdd;
    close();
    if (onAdd) onAdd(files);
  }

  function onKey(event) {
    if (!root) return;
    if (event.key === "Escape") {
      close();
    } else if (event.key === "Enter" && event.target.tagName !== "BUTTON") {
      add();
    } else if (event.key.indexOf("Arrow") !== 0) {
      return;
    }
    // Keep the gallery and map from also reacting to these keys.
    event.stopPropagation();
  }

  function onClick(event) {
    var target = event.target;
    if (target === root || target.closest(".picker-light--close, .picker-cancel")) {
      close();
      return;
    }
    if (target.closest(".picker-add")) {
      add();
      return;
    }
    if (target.closest(".picker-select-all")) {
      var pool = available();
      var allPicked = selectedRecords().length === pool.length;
      selected = {};
      if (!allPicked) {
        pool.forEach(function (r) {
          selected[r.id] = true;
        });
      }
      refresh();
      return;
    }
    var thumb = target.closest(".picker-thumb");
    if (thumb && !thumb.disabled) {
      var id = records[thumb.dataset.index].id;
      selected[id] = !selected[id];
      refresh();
    }
  }

  function open(opts) {
    close();
    options = opts || {};
    selected = {};
    return PhotoReader.read(options.files).then(function (list) {
      records = list.map(function (record, i) {
        var file = options.files[i];
        return Object.assign({}, record, {
          file: file,
          added: options.isAdded ? options.isAdded(file) : false,
        });
      });

      root = document.createElement("div");
      root.className = "picker";
      root.addEventListener("click", onClick);
      document.body.appendChild(root);
      build();
      refresh();
      window.addEventListener("keydown", onKey, true);
      requestAnimationFrame(function () {
        if (!root) return;
        root.classList.add("is-open");
        root.querySelector(".picker-window").focus();
      });
    });
  }

  window.PhotoPicker = { open: open, close: close };
})();
