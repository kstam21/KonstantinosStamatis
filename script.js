window.addEventListener('load', function() {
  setTimeout(function() {
    var pl = document.getElementById('preloader');
    if (pl) pl.classList.add('hidden');
  }, 350);
});

var burger = document.getElementById('burger');
var navLinks = document.getElementById('navLinks');
if (burger && navLinks) {
  burger.addEventListener('click', function() {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() { navLinks.classList.remove('open'); });
  });
}

var revEls = document.querySelectorAll('.rev, .rev-l, .rev-r');
if (revEls.length) {
  var ro = new IntersectionObserver(function(entries) {
    entries.forEach(function(x) {
      if (x.isIntersecting) { x.target.classList.add('vis'); ro.unobserve(x.target); }
    });
  }, { threshold: 0.1 });
  revEls.forEach(function(el) { ro.observe(el); });
}

document.querySelectorAll('.stats-strip, .stats-grid').forEach(function(statsEl) {
  var so = new IntersectionObserver(function(entries) {
    entries.forEach(function(x) {
      if (x.isIntersecting) {
        x.target.querySelectorAll('.stat-n[data-t]').forEach(function(el) {
          var t = parseInt(el.dataset.t, 10);
          var prefix = el.dataset.prefix || '';
          var suffix = el.dataset.suffix || '';
          var c = 0;
          var step = Math.ceil(t / 40);
          var ti = setInterval(function() {
            c = Math.min(c + step, t);
            el.textContent = prefix + c + suffix;
            if (c >= t) clearInterval(ti);
          }, 40);
        });
        so.unobserve(x.target);
      }
    });
  }, { threshold: 0.3 });
  so.observe(statsEl);
});

function toggleRC(card) {
  var d = card.querySelector('.rc-detail');
  var isOpen = d.classList.contains('open');
  document.querySelectorAll('.rc').forEach(function(c) {
    c.querySelector('.rc-detail').classList.remove('open');
    c.classList.remove('open-card');
  });
  if (!isOpen) { d.classList.add('open'); card.classList.add('open-card'); }
}

function handleSubmit(btn) {
  btn.textContent = 'Message Sent!';
  btn.style.background = '#27ae60';
  setTimeout(function() { btn.textContent = 'Send Message'; btn.style.background = ''; }, 3000);
}

/* ---------- EDIT MODE (local only; requires edit-server.py running) ---------- */
(function () {
  var EDITABLE_INLINE_TAGS = ['A', 'STRONG', 'EM', 'BR', 'SPAN', 'I', 'B'];
  var editableEls = [];

  function isTextLeaf(el) {
    if (el.children.length === 0) return el.textContent.trim().length > 0;
    return Array.prototype.every.call(el.children, function (c) {
      return EDITABLE_INLINE_TAGS.indexOf(c.tagName) !== -1;
    }) && el.textContent.trim().length > 0;
  }

  function collectEditableEls() {
    var all = document.querySelectorAll('h1,h2,h3,h4,h5,p,li,span,div');
    var chosen = [];
    all.forEach(function (el) {
      if (el.closest('nav') || el.closest('footer') || el.closest('#edit-toolbar')) return;
      if (chosen.some(function (c) { return c.contains(el); })) return;
      if (!isTextLeaf(el)) return;
      chosen.push(el);
    });
    return chosen;
  }

  function setStatus(msg) {
    var s = document.getElementById('editStatus');
    if (s) s.textContent = msg;
  }

  function startEditing() {
    editableEls = collectEditableEls();
    editableEls.forEach(function (el) { el.setAttribute('contenteditable', 'true'); });
    document.body.classList.add('editing-active');
    document.getElementById('editToggleBtn').style.display = 'none';
    document.getElementById('editSaveBtn').style.display = 'inline-flex';
    document.getElementById('editExitBtn').style.display = 'inline-flex';
    setStatus('Click any text to edit it, then Save.');
  }

  function stopEditing(discard) {
    editableEls.forEach(function (el) { el.removeAttribute('contenteditable'); });
    document.body.classList.remove('editing-active');
    document.getElementById('editToggleBtn').style.display = 'inline-flex';
    document.getElementById('editSaveBtn').style.display = 'none';
    document.getElementById('editExitBtn').style.display = 'none';
    if (discard) { location.reload(); }
    else { setStatus(''); }
  }

  function currentFilename() {
    var path = location.pathname;
    var name = path.substring(path.lastIndexOf('/') + 1);
    return name || 'index.html';
  }

  function saveChanges() {
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    var toolbar = clone.querySelector('#edit-toolbar');
    if (toolbar) toolbar.remove();
    clone.classList.remove('editing-active');
    var html = '<!DOCTYPE html>\n' + clone.outerHTML;

    setStatus('Saving...');
    fetch('/__save__', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentFilename(), html: html })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.ok) {
        setStatus('Saved!');
        setTimeout(function () { stopEditing(false); }, 700);
      } else {
        setStatus('Error: ' + (data.error || 'could not save'));
      }
    }).catch(function () {
      setStatus('Error: is edit-server.py running?');
    });
  }

  function buildToolbar() {
    var bar = document.createElement('div');
    bar.id = 'edit-toolbar';
    var pageName = location.pathname.substring(location.pathname.lastIndexOf('/') + 1) || 'index.html';
    bar.innerHTML =
      '<button id="editToggleBtn" type="button">&#9998; Edit Page</button>' +
      '<a id="editVisualLink" href="editor.html?page=' + pageName + '" target="_blank" rel="noopener">&#127912; Visual Editor</a>' +
      '<button id="editSaveBtn" type="button" style="display:none;">&#128190; Save Changes</button>' +
      '<button id="editExitBtn" type="button" style="display:none;">&#10005; Exit</button>' +
      '<span id="editStatus"></span>';
    document.body.appendChild(bar);

    document.getElementById('editToggleBtn').addEventListener('click', startEditing);
    document.getElementById('editSaveBtn').addEventListener('click', saveChanges);
    document.getElementById('editExitBtn').addEventListener('click', function () { stopEditing(true); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToolbar);
  } else {
    buildToolbar();
  }
})();
