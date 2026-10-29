  // Make It Loud: the text in separate white boxes.
// - A --- (hr) in the post starts the next box; with no --- the text is
//   shared out evenly (by length) over the boxes.
// - `boxes:` in the post's front matter sets the arrangement: rows of
//   boxes, each number a box's width relative to the others in its row:
//       boxes: [2, 1]          one row, two boxes, the first twice as wide
//       boxes:                 two rows: a wide box over three equal ones
//         - [1]
//         - [1, 1, 1]
//   Without `boxes:` it's three boxes side by side (fewer if the text
//   has fewer parts), wrapping on narrow screens.
// Without JS the text simply stays in one box.
(function () {
  var body = document.querySelector(".post-body");
  var kids = Array.prototype.slice.call(body.children);
  if (kids.length < 2) return;
  var rows = JSON.parse(body.dataset.boxes || "null");
  if (rows && typeof rows[0] === "number") rows = [rows];   // boxes: [2, 1] is one row
  var count = rows ? rows.reduce(function (n, r) { return n + r.length; }, 0) : 3;

  var groups = [[]];
  if (kids.some(function (k) { return k.tagName === "HR"; })) {
    kids.forEach(function (k) {
      if (k.tagName === "HR") { groups.push([]); k.remove(); } else groups[groups.length - 1].push(k);
    });
  } else {
    // each element goes to the box its middle falls in (by text length)
    var len = function (k) { return Math.max(k.textContent.trim().length, 1); };
    var total = kids.reduce(function (n, k) { return n + len(k); }, 0);
    var run = 0;
    groups = [];
    for (var g = 0; g < count; g++) groups.push([]);
    kids.forEach(function (k) {
      var mid = run + len(k) / 2;
      groups[Math.min(count - 1, Math.floor(mid / total * count))].push(k);
      run += len(k);
    });
  }
  groups = groups.filter(function (g) { return g.length; });
  var boxes = groups.map(function (g) {
    var col = document.createElement("div");
    col.className = "zine-col";
    g.forEach(function (k) { col.appendChild(k); });
    return col;
  });

  if (!rows) {
    boxes.forEach(function (b) { body.appendChild(b); });
  } else {
    // more parts than boxes: the extras go in a last row, side by side
    var slots = rows.reduce(function (n, r) { return n + r.length; }, 0);
    if (boxes.length > slots) rows = rows.concat([boxes.slice(slots).map(function () { return 1; })]);
    var i = 0;
    rows.forEach(function (widths) {
      if (i >= boxes.length) return;
      var row = document.createElement("div");
      row.className = "zine-row";
      var used = widths.slice(0, boxes.length - i);
      // minmax(0, …): each box keeps exactly its share; text wraps rather than widening it
      row.style.setProperty("--cols", used.map(function (w) { return "minmax(0, " + w + "fr)"; }).join(" "));
      used.forEach(function () { row.appendChild(boxes[i++]); });
      body.appendChild(row);
    });
    body.classList.add("zine-rows");
  }
  body.classList.add("zine-cols");
})();
