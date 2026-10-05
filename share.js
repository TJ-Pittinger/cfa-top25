// CFA Top 25: ballot graphics and the share panel shown after someone votes.
// The image is drawn in the visitor's browser (no server), in two sizes:
//   story  1080 x 1920  (Instagram / Facebook Stories)
//   square 1080 x 1080  (X, Facebook, YouTube posts)
(function () {
  var C = {
    bg: "#0b0b0c", panel: "#151517", line: "#26262b", fg: "#f4f4f5", muted: "#a6a6ad",
    faint: "#6f6f78", accent: "#f36c21", chip: "#f1f1f3", up: "#4ade80", down: "#f87171"
  };
  var DISPLAY = '"Saira Extra Condensed", "Arial Narrow", sans-serif';
  var BODY = '"Archivo", "Helvetica Neue", Arial, sans-serif';

  // ---------- image loading ----------
  var imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) {
      imgCache[src] = new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () { resolve(im); };
        im.onerror = function () { resolve(null); };
        im.src = src;
      });
    }
    return imgCache[src];
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load("800 80px " + DISPLAY), document.fonts.load("700 40px " + DISPLAY),
      document.fonts.load("600 32px " + BODY), document.fonts.load("500 28px " + BODY)
    ]).catch(function () {});
  }

  // ---------- drawing helpers ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
    return text + "…";
  }
  function teamBadge(ctx, cx, cy, r, t, im) {
    ctx.fillStyle = C.chip;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    if (im) {
      var s = r * 1.55;
      ctx.drawImage(im, cx - s / 2, cy - s / 2, s, s);
    } else {
      ctx.fillStyle = "#222";
      ctx.font = "700 " + Math.round(r * 0.62) + "px " + DISPLAY;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t.abbr, cx, cy + 1);
      ctx.textAlign = "left";
    }
  }

  // opts: { ranks:[25 ids], weekLabel, kind:'media'|'fan', name, outlet, records:{id:'5-0'} }
  async function drawBallot(opts, format) {
    await fontsReady();
    var story = format === "story";
    var W = 1080, H = story ? 1920 : 1080;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var teams = opts.ranks.map(function (id) { return team(id); });
    var logos = await Promise.all([loadImg("assets/cfa-logo.png")].concat(teams.map(function (t) {
      return CFA.LOGOS_AVAILABLE ? loadImg("logos/" + t.id + ".png") : Promise.resolve(null);
    })));
    var brand = logos[0], teamLogos = logos.slice(1);

    // Background
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.accent; ctx.fillRect(0, 0, W, 10);

    // Header
    var pad = story ? 72 : 56, top = story ? 90 : 52, badge = story ? 132 : 104;
    ctx.fillStyle = "#fff";
    roundRect(ctx, pad, top, badge, badge, 22); ctx.fill();
    if (brand) ctx.drawImage(brand, pad + 6, top + 6, badge - 12, badge - 12);
    var tx = pad + badge + 28;
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.font = "800 " + (story ? 92 : 74) + "px " + DISPLAY;
    ctx.fillStyle = C.fg; ctx.fillText("CFA ", tx, top + (story ? 78 : 62));
    var cfaW = ctx.measureText("CFA ").width;
    ctx.fillStyle = C.accent; ctx.fillText("TOP 25", tx + cfaW, top + (story ? 78 : 62));
    ctx.font = "700 " + (story ? 34 : 28) + "px " + DISPLAY;
    ctx.fillStyle = C.muted;
    var sub = (opts.weekLabel + " · " + (opts.kind === "media" ? "Media ballot" : "My Fan Poll ballot")).toUpperCase();
    ctx.fillText(fitText(ctx, sub, W - tx - pad), tx, top + (story ? 124 : 100));
    var who = opts.kind === "media" ? [opts.name, opts.outlet].filter(Boolean).join(" · ") : "";
    var headerBottom = top + badge;
    if (who) {
      ctx.font = "600 " + (story ? 40 : 30) + "px " + BODY;
      ctx.fillStyle = C.fg;
      ctx.fillText(fitText(ctx, who, W - pad * 2), pad, headerBottom + (story ? 70 : 50));
      headerBottom += story ? 92 : 66;
    }

    // Rows
    var footerH = story ? 150 : 84;
    var areaTop = headerBottom + (story ? 40 : 26), areaBottom = H - footerH;
    var cols = story ? 1 : 2, perCol = Math.ceil(25 / cols);
    var colGap = 28, colW = (W - pad * 2 - colGap * (cols - 1)) / cols;
    var rowH = (areaBottom - areaTop) / perCol;
    var r = Math.min(rowH * 0.36, story ? 24 : 21);
    var nameSize = Math.round(Math.min(rowH * 0.5, story ? 34 : 27));
    teams.forEach(function (t, i) {
      var col = Math.floor(i / perCol), row = i % perCol;
      var x = pad + col * (colW + colGap), y = areaTop + row * rowH, cy = y + rowH / 2;
      if (row % 2 === 0) { ctx.fillStyle = C.panel; roundRect(ctx, x - 12, y + 2, colW + 24, rowH - 4, 10); ctx.fill(); }
      ctx.textBaseline = "middle";
      ctx.font = "800 " + Math.round(nameSize * 1.25) + "px " + DISPLAY;
      ctx.fillStyle = C.fg; ctx.textAlign = "right";
      ctx.fillText(String(i + 1), x + (story ? 52 : 42), cy + 2);
      ctx.textAlign = "left";
      var bx = x + (story ? 52 : 42) + 20 + r;
      teamBadge(ctx, bx, cy, r, t, teamLogos[i]);
      var nx = bx + r + 18;
      var rec = opts.records && opts.records[t.id];
      var recW = 0;
      if (rec) {
        ctx.font = "500 " + Math.round(nameSize * 0.82) + "px " + BODY;
        recW = ctx.measureText(rec).width;
        ctx.fillStyle = C.muted; ctx.textAlign = "right";
        ctx.fillText(rec, x + colW, cy + 1);
        ctx.textAlign = "left";
      }
      ctx.font = "600 " + nameSize + "px " + BODY;
      ctx.fillStyle = C.fg;
      ctx.fillText(fitText(ctx, t.name, x + colW - nx - recW - 16), nx, cy + 1);
    });

    // Footer
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.line; ctx.fillRect(pad, H - footerH + (story ? 30 : 16), W - pad * 2, 2);
    var cta = opts.kind === "media" ? "SEE EVERY BALLOT AT " : "CAST YOURS AT ";
    var ctaSize = story ? 58 : 42;
    ctx.font = "800 " + ctaSize + "px " + DISPLAY;
    while (ctaSize > 20 && ctx.measureText(cta + "CFATOP25.COM").width > W - pad * 2) {
      ctaSize -= 2; ctx.font = "800 " + ctaSize + "px " + DISPLAY;
    }
    ctx.fillStyle = C.fg; ctx.textAlign = "left";
    var ctaY = H - (story ? 52 : 26);
    ctx.fillText(cta, pad, ctaY);
    ctx.fillStyle = C.accent;
    ctx.fillText("CFATOP25.COM", pad + ctx.measureText(cta).width, ctaY);
    return cv;
  }

  function toBlob(cv) {
    return new Promise(function (resolve) { cv.toBlob(resolve, "image/png"); });
  }

  // ---------- share panel ----------
  var ICON = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L2 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.8c0-.8.5-1 .9-1H17V2.1L14 2c-3.3 0-4 2.4-4 4v2.5H8V12h2v10h4V12h2.7l.4-3.5H14z"/></svg>'
  };

  // opts adds: link (URL to share), shareText (caption)
  function panel(el, opts) {
    var format = "story", currentBlob = null, currentUrl = null, busy = 0;
    var canFileShare = !!(navigator.canShare && window.File &&
      navigator.canShare({ files: [new File([new Blob(["x"], { type: "image/png" })], "t.png", { type: "image/png" })] }));
    var caption = opts.shareText + " " + opts.link;
    var file = "cfa-top25-" + opts.weekLabel.toLowerCase().replace(/\s+/g, "-") + (opts.kind === "media" ? "-media" : "") + ".png";

    el.innerHTML =
      '<div class="share-panel">' +
      '<div class="share-preview"><div class="share-img-wrap" id="sp-wrap"><span class="share-loading">Making your graphic…</span></div></div>' +
      '<div class="share-side">' +
      '<div class="eyebrow"><b>Share your ballot</b></div>' +
      '<h2 class="share-title">Get the word out</h2>' +
      '<div class="tabs" role="group" aria-label="Image size">' +
      '<button type="button" data-fmt="story" aria-pressed="true">Story</button>' +
      '<button type="button" data-fmt="square" aria-pressed="false">Square post</button></div>' +
      '<div class="share-buttons">' +
      (canFileShare ? '<button type="button" class="btn btn-primary" id="sp-share">' + ICON.share + "Share image</button>" : "") +
      '<button type="button" class="btn ' + (canFileShare ? "btn-ghost" : "btn-primary") + '" id="sp-dl">' + ICON.download + "Download image</button>" +
      '<a class="btn btn-ghost" id="sp-x" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + encodeURIComponent(caption) + '">' + ICON.x + "Post on X</a>" +
      '<a class="btn btn-ghost" id="sp-fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(opts.link) + '">' + ICON.fb + "Facebook</a>" +
      '<button type="button" class="btn btn-ghost" id="sp-copy">' + ICON.link + "Copy link</button>" +
      "</div>" +
      '<p class="share-tip" id="sp-tip">' +
      (canFileShare
        ? "<b>Instagram, Facebook Stories and YouTube:</b> tap <b>Share image</b> and pick the app."
        : "<b>Instagram and YouTube:</b> download the image, then add it to your Story or post.") +
      " For X, attach the image to your post so it shows your full ballot.</p>" +
      '<span class="share-status" id="sp-status" role="status"></span>' +
      "</div></div>";

    var status = el.querySelector("#sp-status");
    function say(msg) { status.textContent = msg; clearTimeout(say.t); say.t = setTimeout(function () { status.textContent = ""; }, 3500); }

    async function render() {
      var my = ++busy;
      var wrap = el.querySelector("#sp-wrap");
      wrap.className = "share-img-wrap " + format;
      var cv = await drawBallot(opts, format);
      if (my !== busy) return;
      currentBlob = await toBlob(cv);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(currentBlob);
      wrap.innerHTML = '<img src="' + currentUrl + '" alt="Your ' + opts.weekLabel + ' ballot graphic">';
    }

    el.querySelectorAll("[data-fmt]").forEach(function (b) {
      b.addEventListener("click", function () {
        format = b.dataset.fmt;
        el.querySelectorAll("[data-fmt]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        render();
      });
    });
    var shareBtn = el.querySelector("#sp-share");
    if (shareBtn) shareBtn.addEventListener("click", async function () {
      if (!currentBlob) return;
      try {
        await navigator.share({ files: [new File([currentBlob], file, { type: "image/png" })], text: caption });
      } catch (e) {
        if (e && e.name !== "AbortError") say("Sharing didn't work here. Try Download image.");
      }
    });
    el.querySelector("#sp-dl").addEventListener("click", function () {
      if (!currentUrl) return;
      var a = document.createElement("a");
      a.href = currentUrl; a.download = file;
      document.body.appendChild(a); a.click(); a.remove();
      say("Saved " + file);
    });
    el.querySelector("#sp-copy").addEventListener("click", function () {
      var done = function () { say("Link copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(opts.link).then(done, function () { window.prompt("Copy this link:", opts.link); });
      } else window.prompt("Copy this link:", opts.link);
    });
    render();
  }

  window.CFAShare = { drawBallot: drawBallot, panel: panel };
})();
