// Tags: /tags/ shows the cloud; /tags/?tag=NAME (or an old #NAME link) shows
// just that tag's posts. Without JS every tag's section simply shows.
(function () {
  var q = new URLSearchParams(location.search).get("tag") || location.hash.slice(1);
  var section = q && document.querySelector('.tag-section[data-tag="' + CSS.escape(q) + '"]');
  if (!section) return;
  section.classList.add("is-active");
  document.documentElement.classList.add("tag-filtered");
  document.title = section.dataset.name + " · " + document.title.split(" · ").pop();
})();
