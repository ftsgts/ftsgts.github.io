// Archives: /archives/?stream=N shows just stream N (its sign, its posts by
// date, its tags). Without JS the streams' sections simply show at the end.
(function () {
  var q = new URLSearchParams(location.search).get("stream");
  var section = q && document.querySelector('.stream-section[data-stream="' + CSS.escape(q) + '"]');
  if (!section) return;
  section.classList.add("is-active");
  document.documentElement.classList.add("stream-filtered");
})();
