/* deck-stage.js — Lightweight slide presentation engine */
(function() {
  // Inject base styles
  var s = document.createElement('style');
  s.textContent = 'deck-stage{display:block;position:relative;overflow:hidden}deck-stage .slide{position:absolute;inset:0;display:none;opacity:0;transition:opacity .8s cubic-bezier(.2,.75,.2,1)}deck-stage .slide.active{display:block;opacity:1}';
  document.documentElement.appendChild(s);

  function DeckStage() {
    this._idx = 0;
    this._slides = [];
    this._ready = false;
  }
  DeckStage.prototype = Object.create(HTMLElement.prototype);
  DeckStage.prototype.constructor = DeckStage;

  DeckStage.prototype.connectedCallback = function() {
    var self = this;
    var w = this.getAttribute('width') || '1920';
    var h = this.getAttribute('height') || '1080';
    this.style.width = w + 'px';
    this.style.height = h + 'px';
    this.style.margin = '0 auto';
    this.style.background = '#0a0a0a';

    // Wait for DOM
    function init() {
      self._slides = Array.prototype.slice.call(self.querySelectorAll('.slide'));
      if (!self._slides.length) { setTimeout(init, 100); return; }
      self._slides.forEach(function(sl, i) {
        if (i === 0) { sl.classList.add('active'); sl.style.display = 'block'; sl.style.opacity = '1'; }
      });
      self._ready = true;
      self._bindKeys();
      self._bindTouch();
      setTimeout(function() { self._revealActive(); }, 400);
    }
    setTimeout(init, 50);
  };

  DeckStage.prototype._bindKeys = function() {
    var self = this;
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); self.next(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); self.prev(); }
      if (e.key === 'Home') { e.preventDefault(); self.goTo(0); }
      if (e.key === 'End') { e.preventDefault(); self.goTo(self._slides.length - 1); }
    });
  };

  DeckStage.prototype._bindTouch = function() {
    var self = this, sx = 0;
    this.addEventListener('touchstart', function(e) { sx = e.touches[0].clientX; }, { passive: true });
    this.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) { dx < 0 ? self.next() : self.prev(); }
    }, { passive: true });
  };

  DeckStage.prototype._revealActive = function() {
    var self = this;
    this._slides.forEach(function(s) {
      var els = s.querySelectorAll('.reveal');
      els.forEach(function(el) {
        if (s.classList.contains('active')) el.classList.add('in');
        else { el.classList.remove('in'); el.style.opacity = '0'; el.style.transform = 'translateY(26px)'; }
      });
      var ht = s.querySelector('.hero-title');
      if (ht) {
        if (s.classList.contains('active')) ht.classList.add('in');
        else ht.classList.remove('in');
      }
    });
  };

  DeckStage.prototype.next = function() { if (this._idx < this._slides.length - 1) this.goTo(this._idx + 1); };
  DeckStage.prototype.prev = function() { if (this._idx > 0) this.goTo(this._idx - 1); };

  DeckStage.prototype.goTo = function(i) {
    if (i < 0 || i >= this._slides.length || i === this._idx) return;
    var self = this;
    var old = this._slides[this._idx];
    var nxt = this._slides[i];
    old.style.opacity = '0';
    // Reset reveal on old
    old.querySelectorAll('.reveal').forEach(function(el) { el.classList.remove('in'); });
    setTimeout(function() { old.classList.remove('active'); old.style.display = 'none'; }, 800);
    nxt.style.display = 'block';
    requestAnimationFrame(function() {
      nxt.classList.add('active');
      nxt.style.opacity = '1';
    });
    this._idx = i;
    this._revealActive();
    this.dispatchEvent(new CustomEvent('slidechange', { detail: { index: i } }));
    // Update dots
    var dots = document.querySelectorAll('.nav-dot');
    dots.forEach(function(d, di) { d.classList.toggle('active', di === i); });
  };

  try {
    customElements.define('deck-stage', DeckStage);
  } catch(e) {
    // Fallback: polyfill
    document.addEventListener('DOMContentLoaded', function() {
      try { customElements.define('deck-stage', DeckStage); } catch(e2) {}
    });
  }
})();
