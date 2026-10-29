// Posts with `toc: true`: build the contents list from the post's ## and ###
// headings, and highlight the section currently being read.
(function () {
  var list = document.getElementById("toc-list");
  var toc = list.closest(".toc");
  var heads = document.querySelectorAll(".post-body h2[id], .post-body h3[id]");
  if (!heads.length) { toc.remove(); return; }

  heads.forEach(function (h) {
    var li = document.createElement("li");
    li.className = "toc-" + h.tagName.toLowerCase();
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    list.appendChild(li);
  });

  // Collapsed by default when it sits above the post (narrow screens).
  if (window.matchMedia("(max-width: 1199px)").matches) toc.open = false;

  var links = list.querySelectorAll("a");
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (l) {
        l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id);
      });
    });
  }, { rootMargin: "0px 0px -70% 0px" });
  heads.forEach(function (h) { observer.observe(h); });
})();
