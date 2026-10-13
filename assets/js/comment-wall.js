/* The wall's script, for both its pages:
     /wall/        reads what's on the wall from the Worker (data-api) and
                   lays it across the concrete, newest first: every piece
                   the same size, each in one of a few typefaces and inks,
                   with its signature and when it was written.
     /wall/write/  the form: posts to the Worker, then goes back to the
                   wall (data-wall).
   Everything is put on the page as plain text, never as HTML. */
(function () {
  var root = document.getElementById("comment-wall");
  if (!root) return;
  var api = root.getAttribute("data-api").replace(/\/$/, "") + "/comments";
  var status = root.querySelector(".cw-status");
  var wall = document.querySelector(".cw-wall");
  var form = root.querySelector(".cw-form");
  var JUST = "ftsgts-wall-just-posted";   // the writer's own piece, carried to the wall

  function store(fn) { try { return fn(window.sessionStorage); } catch (e) { return null; } }

  /* ---------------- the wall ---------------- */
  if (wall) {
    // the same piece always looks the same: its face and ink come from its id
    var seed = function (id) {
      var h = 0;
      for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      return h;
    };

    // when it was written, in the reader's own time: "10 Oct, 15:04"
    var posted = function (at) {
      var d = new Date(at);
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      return d.getDate() + " " + months[d.getMonth()] + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    };

    var piece = function (c) {
      var h = seed(c.id);
      var li = document.createElement("li");
      li.className = "cw-piece";
      li.setAttribute("data-face", h % 6);
      li.setAttribute("data-ink", (h >>> 8) % 4);

      var p = document.createElement("p");
      p.className = "cw-text";
      p.dir = "auto";              // right-to-left writing shows right-to-left
      p.textContent = c.text;
      li.appendChild(p);

      var foot = document.createElement("p");
      foot.className = "cw-foot";
      if (c.name) {
        var s = document.createElement("span");
        s.className = "cw-name";
        s.dir = "auto";
        s.textContent = "— " + c.name;
        foot.appendChild(s);
      }
      var t = document.createElement("time");
      t.className = "cw-when";
      t.dateTime = new Date(c.at).toISOString();
      t.textContent = posted(c.at);
      foot.appendChild(t);
      li.appendChild(foot);
      return li;
    };

    var just = store(function (s) { var v = s.getItem(JUST); s.removeItem(JUST); return v && JSON.parse(v); });

    fetch(api, { credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.comments;
        // a piece posted a moment ago may not have reached every copy of the
        // storage yet: show it anyway
        if (just && !list.some(function (c) { return c.id === just.id; })) list.unshift(just);
        list.forEach(function (c) { wall.appendChild(piece(c)); });
        if (just) status.textContent = "It’s on the wall.";
        else if (!list.length) status.textContent = "The wall is open.";
        if (!data.open) status.textContent = "The wall is closed for now.";
      })
      .catch(function () { status.textContent = "The wall can’t be reached right now."; });
  }

  /* ---------------- the form ---------------- */
  if (form) {
    var box = form.querySelector("textarea");
    var button = form.querySelector("button");
    var opened = Date.now();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      button.disabled = true;
      status.textContent = "Writing…";
      fetch(api, {
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: box.value,
          name: form.elements.name.value,
          website: form.elements.website.value,
          ms: Date.now() - opened
        })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) { status.textContent = res.d.error || "That didn’t work."; button.disabled = false; return; }
          if (res.d.comment) store(function (s) { s.setItem(JUST, JSON.stringify(res.d.comment)); });
          window.location.href = root.getAttribute("data-wall");
        })
        .catch(function () { status.textContent = "That didn’t work. Try again."; button.disabled = false; });
    });
  }
})();
