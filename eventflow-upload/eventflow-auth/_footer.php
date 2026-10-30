<?php /* Closes _header.php */ ?>
  <div class="footer-link">
    <a href="/eventflow.html">← Back to EventFlow Schematics</a>
  </div>
</div>

<style>
  .pl-pw-wrap { position: relative; }
  .pl-pw-wrap input[type="password"],
  .pl-pw-wrap input[type="text"]   { padding-right: 42px !important; }
  .pl-pw-toggle {
    position: absolute; top: 50%; right: 8px;
    transform: translateY(-50%);
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 0; padding: 0;
    color: #94a3b8; cursor: pointer; border-radius: 6px;
    transition: color .15s, background .15s;
  }
  .pl-pw-toggle:hover  { color: #e2e8f0; background: rgba(148,163,184,.12); }
  .pl-pw-toggle:focus  { outline: 2px solid #38bdf8; outline-offset: 1px; }
  .pl-pw-toggle svg    { width: 18px; height: 18px; pointer-events: none; }
  .pl-pw-toggle .icon-hide { display: none; }
  .pl-pw-toggle.is-on .icon-show { display: none; }
  .pl-pw-toggle.is-on .icon-hide { display: block; }
</style>
<script>
(function () {
  var SHOW =
    '<svg class="icon-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>' +
    '<circle cx="12" cy="12" r="3"/></svg>';
  var HIDE =
    '<svg class="icon-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.77 19.77 0 0 1 5.06-5.94"/>' +
    '<path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.86 19.86 0 0 1-3.17 4.19"/>' +
    '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>' +
    '<line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function attach(input) {
    if (!input || input.dataset.pwReady === '1') return;
    input.dataset.pwReady = '1';

    var wrap = document.createElement('div');
    wrap.className = 'pl-pw-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pl-pw-toggle';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = SHOW + HIDE;
    btn.addEventListener('click', function () {
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.classList.toggle('is-on', !showing);
      btn.setAttribute('aria-pressed', String(!showing));
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
    wrap.appendChild(btn);
  }

  function init() {
    var inputs = document.querySelectorAll('input[type="password"]');
    for (var i = 0; i < inputs.length; i++) attach(inputs[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
</script>
</body>
</html>
