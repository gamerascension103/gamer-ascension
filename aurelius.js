/*
 * Aurelius — Gamer Ascension
 *
 * Astral vessel of the Crafted (species shared with The Guide), assigned
 * to the Scriptorium. Where Guide is the teacher in the Atheneum,
 * Aurelius is the steward of reflective practice here in the Scriptorium.
 *
 * Deep canon notes:
 *   - Same species as Guide. The structural anatomy is parallel:
 *     anchors/threads, runic perimeter marks, orbital shapes, a central eye.
 *   - Visually differentiated by purpose. Guide's palette is violet/cyan
 *     (starlight/cerebral); Aurelius's is amber/gold (firelight/contemplative).
 *     Guide's orbitals are varied polygons (pentagon/triangle/square/hexagon/
 *     inner-circle) representing the variety of what is taught; Aurelius's
 *     orbitals are concentric rings of varying thickness, each breathing at a
 *     different rate, because he holds a single kind of space rather than
 *     teaching varied content.
 *   - Eye is vertical slit (inward-watching) rather than horizontal almond
 *     (outward-teaching). Guide sees the Ascendant; Aurelius watches the
 *     writing happen.
 *   - Three anchors in triangle (writer, page, witness) rather than Guide's
 *     four cardinal anchors.
 *   - Seven runic perimeter marks for the seven days of the week (the
 *     cyclical daily-return of the journaling practice).
 *   - Animation rhythm is slow and breath-like rather than Guide's counter-
 *     rotating complexity. Aurelius is a meditative presence, not an active
 *     agent.
 *
 * Usage:
 *   Include via script tag: src equals "aurelius.js"
 *   Then call Aurelius.init with config:
 *     - chamber: unique storage key (e.g. "scriptorium")
 *     - chamberName: display name ("The Scriptorium")
 *     - script: array of dialogue lines for first visit
 *     - autoSummonDelay: ms delay for first-visit auto-summon (default 1500)
 *
 *   For one-off dialogues at milestones:
 *     Aurelius.summonOneOff([{speaker: 'Aurelius', text: '...'}, ...])
 */

(function(global){
  'use strict';

  var config = null;
  var dialogueIndex = 0;
  var typewriterTimeout = null;
  var isOpen = false;

  // Tap-to-skip: typewriter functions set these so the completion handler
  // can finish the current line instantly if the user taps mid-typing.
  var currentTypingFullText = '';
  var currentTypingCompletion = null;

  var summonEl = null;
  var overlayEl = null;
  var dialogueTextEl = null;
  var speakerNameEl = null;
  var progressEl = null;
  var continueBtn = null;
  var sigilEl = null;

  var Aurelius = {
    init: function(userConfig){
      config = userConfig || {};
      if(!config.chamber || !Array.isArray(config.script)){
        console.warn('Aurelius.init: missing chamber or script');
        return;
      }

      injectStyles();
      buildDOM();
      bindEvents();

      // Auto-summon on first visit. Subsequent visits are quiet — no
      // auto-dialogue, the user can summon by clicking the persistent
      // sigil if they want him.
      try {
        var seen = localStorage.getItem('ga_aurelius_seen_' + config.chamber);
        if(seen !== '1'){
          var delay = (typeof config.autoSummonDelay === 'number') ? config.autoSummonDelay : 1500;
          setTimeout(function(){ Aurelius.summon(); }, delay);
        }
      } catch(e){}
    },

    // Summon the vessel with the default first-visit script.
    summon: function(){
      if(!overlayEl || isOpen) return;
      isOpen = true;
      dialogueIndex = 0;

      overlayEl.classList.add('active');
      document.body.classList.add('aurelius-active');

      // Mark as seen so subsequent page loads don't auto-summon.
      try { localStorage.setItem('ga_aurelius_seen_' + config.chamber, '1'); } catch(e){}

      // Start ambient systems — particles rising from flames, eye
      // tracking following cursor. Both run on RAF loops and stop
      // gracefully on dismiss.
      startParticles();
      startEyeTracking();

      setTimeout(renderDialogueLine, 500);
    },

    // Play a custom dialogue line set (e.g., session milestone lines).
    // Does not overwrite the default script.
    summonOneOff: function(scriptLines){
      if(!overlayEl || isOpen) return;
      if(!Array.isArray(scriptLines) || scriptLines.length === 0) return;

      isOpen = true;
      dialogueIndex = 0;

      // Temporarily swap in the one-off script. Restored on dismiss.
      var savedScript = config.script;
      config.script = scriptLines;
      config._restoreScriptOnDismiss = savedScript;

      overlayEl.classList.add('active');
      document.body.classList.add('aurelius-active');

      // Same ambient systems as the default summon
      startParticles();
      startEyeTracking();

      setTimeout(renderDialogueLine, 500);
    },

    // Manually clear the "seen" flag. Useful for dev reset.
    reset: function(){
      try { localStorage.removeItem('ga_aurelius_seen_' + config.chamber); } catch(e){}
      location.reload();
    }
  };

  // ==================================================================
  // DOM construction
  // ==================================================================

  function buildDOM(){
    // Persistent summon button — a small sigil in a fixed corner, always
    // visible on Scriptorium pages. Clicking re-invokes Aurelius.
    summonEl = document.createElement('button');
    summonEl.className = 'aurelius-summon';
    summonEl.id = 'aureliusSummon';
    summonEl.setAttribute('aria-label', 'Summon Aurelius');
    summonEl.setAttribute('title', 'Summon Aurelius');
    summonEl.innerHTML =
      '<svg class="aurelius-summon-sigil" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="aureliusSummonIris" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#fff4c8" stop-opacity="1"/>' +
            '<stop offset="18%" stop-color="#f5c85a" stop-opacity="1"/>' +
            '<stop offset="50%" stop-color="#b58a2f" stop-opacity="1"/>' +
            '<stop offset="85%" stop-color="#6b4818" stop-opacity="1"/>' +
            '<stop offset="100%" stop-color="#2a1a08" stop-opacity="1"/>' +
          '</radialGradient>' +
        '</defs>' +
        // Concentric gold rings with black underlay (matches main sigil aesthetic)
        '<circle cx="50" cy="50" r="38" fill="none" stroke="#000000" stroke-width="2" opacity="0.7"/>' +
        '<circle cx="50" cy="50" r="38" fill="none" stroke="rgba(229,197,116,0.5)" stroke-width="1"/>' +
        '<circle cx="50" cy="50" r="28" fill="none" stroke="#000000" stroke-width="1.8" opacity="0.7"/>' +
        '<circle cx="50" cy="50" r="28" fill="none" stroke="rgba(229,197,116,0.7)" stroke-width="0.9"/>' +
        // Socket backing for the eye
        '<ellipse cx="50" cy="50" rx="8" ry="15" fill="#0a0604" opacity="0.85"/>' +
        // Sclera + iris
        '<ellipse cx="50" cy="50" rx="5" ry="11" fill="url(#aureliusSummonIris)"/>' +
        // Pupil
        '<ellipse cx="50" cy="50" rx="1.5" ry="5" fill="#000000"/>' +
        // Highlight
        '<circle cx="50.8" cy="47.5" r="0.6" fill="#ffffff"/>' +
        // Eye outline
        '<path d="M 50 39 Q 42 50, 50 61 Q 58 50, 50 39 Z" fill="none" stroke="rgba(245,238,204,0.9)" stroke-width="0.8"/>' +
      '</svg>';
    document.body.appendChild(summonEl);

    // The full overlay — stage + dialogue box. Hidden by default, active
    // class shown on summon. Body-level so it sits above all Scriptorium UI.
    overlayEl = document.createElement('div');
    overlayEl.className = 'aurelius-overlay';
    overlayEl.id = 'aureliusOverlay';
    overlayEl.innerHTML =
      '<div class="aurelius-overlay-bg"></div>' +
      '<button class="aurelius-close" aria-label="Dismiss Aurelius" title="Dismiss">&times;</button>' +
      '<div class="aurelius-stage">' +
        '<div class="aurelius-aura"></div>' +
        '<div class="aurelius-sigil-wrap" id="aureliusSigilWrap">' +
          '<div class="aurelius-sigil-glow"></div>' +
          '<svg class="aurelius-sigil" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' +
            '<defs>' +
              '<filter id="aureliusSigilGlow" x="-50%" y="-50%" width="200%" height="200%">' +
                '<feGaussianBlur stdDeviation="2.5" result="blur"/>' +
                '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
              '</filter>' +
              // Ambient halo behind the eye — warm firelight bleed. Sits
              // behind the whole eye assembly to give it presence.
              '<radialGradient id="aureliusEyeGrad" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#fff4c8" stop-opacity="1"/>' +
                '<stop offset="35%" stop-color="#e5c574" stop-opacity="0.85"/>' +
                '<stop offset="100%" stop-color="#8a6020" stop-opacity="0.25"/>' +
              '</radialGradient>' +
              // Dragon iris gradient — bright gold core around pupil,
              // mid-amber midband, dark amber at outer rim. This is the
              // core of the dragon-eye aesthetic.
              '<radialGradient id="aureliusIrisGrad" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#fff4c8" stop-opacity="1"/>' +
                '<stop offset="18%" stop-color="#f5c85a" stop-opacity="1"/>' +
                '<stop offset="50%" stop-color="#b58a2f" stop-opacity="1"/>' +
                '<stop offset="85%" stop-color="#6b4818" stop-opacity="1"/>' +
                '<stop offset="100%" stop-color="#2a1a08" stop-opacity="1"/>' +
              '</radialGradient>' +
              // Eye socket — dark radial behind the eye for depth.
              '<radialGradient id="aureliusEyeSocket" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#000000" stop-opacity="0.9"/>' +
                '<stop offset="70%" stop-color="#0a0604" stop-opacity="0.7"/>' +
                '<stop offset="100%" stop-color="#1a0f05" stop-opacity="0"/>' +
              '</radialGradient>' +
              // Clip path matching the iris ellipse — used to constrain
              // the striation lines to stay inside the iris.
              '<clipPath id="aureliusIrisClip">' +
                '<ellipse cx="200" cy="200" rx="11" ry="22"/>' +
              '</clipPath>' +
              // Flame gradient — dark amber base at the wick through warm
              // gold middle to bright cream tip. Used for both the central
              // hearth and the three anchor candle flames.
              '<linearGradient id="aureliusFlameGrad" x1="50%" y1="100%" x2="50%" y2="0%">' +
                '<stop offset="0%" stop-color="#6b4818" stop-opacity="0.95"/>' +
                '<stop offset="25%" stop-color="#cd7f32" stop-opacity="1"/>' +
                '<stop offset="55%" stop-color="#e5c574" stop-opacity="1"/>' +
                '<stop offset="85%" stop-color="#fff4c8" stop-opacity="1"/>' +
                '<stop offset="100%" stop-color="#ffffff" stop-opacity="0.9"/>' +
              '</linearGradient>' +
              // Inner flame gradient — hotter, more compact. Used for
              // the inner "core" of each flame visible inside the outer
              // shape to suggest a blue-hot center without actually using
              // blue (which would break the palette).
              '<linearGradient id="aureliusFlameCore" x1="50%" y1="100%" x2="50%" y2="0%">' +
                '<stop offset="0%" stop-color="#b58a2f" stop-opacity="0.8"/>' +
                '<stop offset="50%" stop-color="#fff4c8" stop-opacity="0.95"/>' +
                '<stop offset="100%" stop-color="#ffffff" stop-opacity="0.7"/>' +
              '</linearGradient>' +
              // Filter that gives flames a soft bloom/glow on their edges.
              '<filter id="aureliusFlameGlow" x="-80%" y="-30%" width="260%" height="160%">' +
                '<feGaussianBlur stdDeviation="1.8" result="flameBlur"/>' +
                '<feMerge>' +
                  '<feMergeNode in="flameBlur"/>' +
                  '<feMergeNode in="SourceGraphic"/>' +
                '</feMerge>' +
              '</filter>' +
            '</defs>' +

            // THREE ANCHORS in triangle formation — writer, page, witness.
            // Top (200,60), bottom-left (90,300), bottom-right (310,300).
            // Rendered as iron rivets: black fill with gold rim, holding
            // the form together like blacksmith's work.
            '<g class="au-anchors">' +
              '<line class="au-thread" x1="200" y1="60" x2="200" y2="140" stroke="rgba(229,197,116,0.5)" stroke-width="1" stroke-linecap="round"/>' +
              '<line class="au-thread" x1="90" y1="300" x2="155" y2="240" stroke="rgba(229,197,116,0.5)" stroke-width="1" stroke-linecap="round"/>' +
              '<line class="au-thread" x1="310" y1="300" x2="245" y2="240" stroke="rgba(229,197,116,0.5)" stroke-width="1" stroke-linecap="round"/>' +
              '<path class="au-anchor" d="M 200 50 L 210 60 L 200 70 L 190 60 Z" fill="#0a0604" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-linejoin="round"/>' +
              '<path class="au-anchor" d="M 90 290 L 100 300 L 90 310 L 80 300 Z" fill="#0a0604" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-linejoin="round"/>' +
              '<path class="au-anchor" d="M 310 290 L 320 300 L 310 310 L 300 300 Z" fill="#0a0604" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-linejoin="round"/>' +
              // Small bright center on each anchor — a gold nail-head dot
              '<circle cx="200" cy="60" r="1.5" fill="#f5eecc"/>' +
              '<circle cx="90" cy="300" r="1.5" fill="#f5eecc"/>' +
              '<circle cx="310" cy="300" r="1.5" fill="#f5eecc"/>' +
            '</g>' +

            // THREE ANCHOR CANDLE FLAMES — one small flame rising from
            // each iron-rivet anchor. Each is a gold teardrop pointing
            // upward, with a brighter inner core. Lightly flickering
            // independently so they look alive but not agitated.
            //
            // Flame shape: two cubic bezier curves forming a teardrop
            // pointed upward. The base is ~6px wide, the flame ~12px
            // tall, tip at anchor_y - 14. All three flames use the same
            // shape but are positioned at the three anchor points.
            '<g class="au-candles">' +
              // TOP ANCHOR flame — at (200, 50), burning upward
              '<g class="au-candle au-candle-top" filter="url(#aureliusFlameGlow)">' +
                '<path d="M 200 48 C 197 42, 195 36, 200 28 C 205 36, 203 42, 200 48 Z" fill="url(#aureliusFlameGrad)"/>' +
                '<path d="M 200 46 C 198.5 42, 197.5 38, 200 33 C 202.5 38, 201.5 42, 200 46 Z" fill="url(#aureliusFlameCore)" opacity="0.9"/>' +
              '</g>' +
              // BOTTOM-LEFT anchor flame — at (90, 290)
              '<g class="au-candle au-candle-bl" filter="url(#aureliusFlameGlow)">' +
                '<path d="M 90 288 C 87 282, 85 276, 90 268 C 95 276, 93 282, 90 288 Z" fill="url(#aureliusFlameGrad)"/>' +
                '<path d="M 90 286 C 88.5 282, 87.5 278, 90 273 C 92.5 278, 91.5 282, 90 286 Z" fill="url(#aureliusFlameCore)" opacity="0.9"/>' +
              '</g>' +
              // BOTTOM-RIGHT anchor flame — at (310, 290)
              '<g class="au-candle au-candle-br" filter="url(#aureliusFlameGlow)">' +
                '<path d="M 310 288 C 307 282, 305 276, 310 268 C 315 276, 313 282, 310 288 Z" fill="url(#aureliusFlameGrad)"/>' +
                '<path d="M 310 286 C 308.5 282, 307.5 278, 310 273 C 312.5 278, 311.5 282, 310 286 Z" fill="url(#aureliusFlameCore)" opacity="0.9"/>' +
              '</g>' +
            '</g>' +

            // SEVEN RUNIC PERIMETER MARKS — one for each day of the
            // weekly cycle. Spaced 360/7 ≈ 51.4 degrees apart. Each rune
            // is a gold mark set in a small black socket, giving them
            // the feel of iron-riveted studs around the perimeter.
            '<g class="au-runes">' +
              '<g class="au-rune" transform="rotate(0 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(51.4 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(102.8 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(154.2 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(205.6 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(257 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(308.4 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
            '</g>' +

            // FIVE CONCENTRIC RINGS — not polygons like Guide. Each ring
            // rotates slowly at a different rate (slower than Guide's),
            // with gap positions arranged so visually a "pulse" of gaps
            // runs through the layers. Rings use stroke-dasharray to
            // create the opening. Each ring is paired with a black
            // underlay stroke at slightly wider width, giving it the
            // relief of gold inlaid in black iron.
            // Ring 1 (outermost) — radius 160, slowest
            '<g class="au-orbit au-orbit-1">' +
              '<circle cx="200" cy="200" r="160" fill="none" stroke="#000000" stroke-width="2.6" stroke-dasharray="940 65" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="160" fill="none" stroke="rgba(229,197,116,0.85)" stroke-width="1.4" stroke-dasharray="940 65" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 2 — radius 135
            '<g class="au-orbit au-orbit-2">' +
              '<circle cx="200" cy="200" r="135" fill="none" stroke="#000000" stroke-width="2.5" stroke-dasharray="790 55" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="135" fill="none" stroke="rgba(229,197,116,0.9)" stroke-width="1.3" stroke-dasharray="790 55" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 3 — radius 115
            '<g class="au-orbit au-orbit-3">' +
              '<circle cx="200" cy="200" r="115" fill="none" stroke="#000000" stroke-width="2.4" stroke-dasharray="670 50" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="115" fill="none" stroke="rgba(229,197,116,0.95)" stroke-width="1.2" stroke-dasharray="670 50" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 4 — radius 95
            '<g class="au-orbit au-orbit-4">' +
              '<circle cx="200" cy="200" r="95" fill="none" stroke="#000000" stroke-width="2.3" stroke-dasharray="550 45" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="95" fill="none" stroke="rgba(245,215,140,1)" stroke-width="1.1" stroke-dasharray="550 45" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 5 (innermost) — radius 78, fastest
            '<g class="au-orbit au-orbit-5">' +
              '<circle cx="200" cy="200" r="78" fill="none" stroke="#000000" stroke-width="2.2" stroke-dasharray="450 40" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="78" fill="none" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-dasharray="450 40" stroke-linecap="round"/>' +
            '</g>' +

            // CENTRAL HEARTH — the flame Aurelius watches over. Sits in
            // the lower portion of the inner ring, below the eye. The eye
            // renders after this group so it appears to watch down over
            // the flame tip. Scriptorium as candlelit library: he is the
            // keeper of the fire at his center.
            //
            // Base at (200, 272), tip at (200, 240). Height = 32, flame
            // width at base roughly 14. Slightly larger than the anchor
            // candles (visually the primary flame), but still compact
            // enough to sit within the innermost ring.
            '<g class="au-hearth" filter="url(#aureliusFlameGlow)">' +
              // Small base glow — a dim amber pool at the wick base
              '<ellipse cx="200" cy="273" rx="10" ry="2.5" fill="#cd7f32" opacity="0.55"/>' +
              // Outer flame body — larger, softer teardrop
              '<path d="M 200 272 C 192 262, 188 252, 200 234 C 212 252, 208 262, 200 272 Z" fill="url(#aureliusFlameGrad)"/>' +
              // Inner flame core — brighter, narrower, suggests the hot
              // heart of the fire without using blue
              '<path d="M 200 270 C 195 262, 193 254, 200 242 C 207 254, 205 262, 200 270 Z" fill="url(#aureliusFlameCore)" opacity="0.92"/>' +
              // Innermost bright point — the wick spark at the very base
              '<circle cx="200" cy="270" r="1.5" fill="#ffffff" opacity="0.9"/>' +
            '</g>' +

            // PARTICLE LAYER — empty group that JS populates with rising
            // ember circles. Rendered before the eye so embers pass
            // behind the eye, giving the impression he watches through
            // rising firelight.
            '<g class="au-particles" id="auParticles"></g>' +

            // THE EYE — dragon eye, regal and watchful. Vertical slit
            // pupil, detailed amber iris with radial striations, sharp
            // black outer rim, bright specular highlight, subtle upper
            // brow ridge. Inward-watching but calm — the eye of something
            // ancient and patient, not predatory.
            '<g class="au-eye" filter="url(#aureliusSigilGlow)">' +
              '<g class="au-eye-lids">' +
                // Ambient halo — warm firelight bleed behind the eye
                '<ellipse class="au-eye-halo" cx="200" cy="200" rx="30" ry="56" fill="url(#aureliusEyeGrad)" opacity="0.55"/>' +
                // Eye socket — dark radial gives the eye a backing so
                // the iris gold pops against it
                '<ellipse class="au-eye-socket" cx="200" cy="200" rx="20" ry="44" fill="url(#aureliusEyeSocket)"/>' +
                // Black outer rim of the eye opening — inside-drawn,
                // creates the hard edge that makes it read as dragon
                '<path class="au-eye-rim-outer" d="M 200 152 Q 180 200, 200 248 Q 220 200, 200 152 Z" fill="#000000" stroke="none"/>' +
                // The lens opening — slightly smaller than the rim, fills
                // with a cream-gold that represents the sclera
                '<path class="au-eye-sclera" d="M 200 156 Q 182 200, 200 244 Q 218 200, 200 156 Z" fill="#2a1a08" stroke="none"/>' +
                // Iris — large vertical ellipse with radial gradient.
                // The gradient runs from bright gold center to dark amber
                // outer edge, which is the core of the dragon-eye look.
                '<ellipse class="au-eye-iris" cx="200" cy="200" rx="11" ry="22" fill="url(#aureliusIrisGrad)"/>' +
                // Iris striations — 16 fine radial lines from the pupil
                // edge to the iris edge. Clipped to stay inside the iris.
                // These are what make the eye read as living/textured
                // rather than flat.
                '<g class="au-iris-striations" clip-path="url(#aureliusIrisClip)">' +
                  '<line x1="200" y1="182" x2="200" y2="178" stroke="#2a1a08" stroke-width="0.5" opacity="0.75"/>' +
                  '<line x1="200" y1="218" x2="200" y2="222" stroke="#2a1a08" stroke-width="0.5" opacity="0.75"/>' +
                  '<line x1="204" y1="184" x2="205.5" y2="180" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="196" y1="184" x2="194.5" y2="180" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="204" y1="216" x2="205.5" y2="220" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="196" y1="216" x2="194.5" y2="220" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="207" y1="190" x2="210" y2="186" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="193" y1="190" x2="190" y2="186" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="207" y1="210" x2="210" y2="214" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="193" y1="210" x2="190" y2="214" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="208" y1="196" x2="211" y2="194" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="192" y1="196" x2="189" y2="194" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="208" y1="204" x2="211" y2="206" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="192" y1="204" x2="189" y2="206" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="208" y1="200" x2="211" y2="200" stroke="#2a1a08" stroke-width="0.4" opacity="0.5"/>' +
                  '<line x1="192" y1="200" x2="189" y2="200" stroke="#2a1a08" stroke-width="0.4" opacity="0.5"/>' +
                '</g>' +
                // Iris outer ring — thin dark line defining the iris edge
                '<ellipse class="au-iris-ring" cx="200" cy="200" rx="11" ry="22" fill="none" stroke="#1a0f05" stroke-width="0.8"/>' +
                // Inner iris hot ring — bright thin ring just around the
                // pupil, intensifies the glow at the center
                '<ellipse class="au-iris-hot" cx="200" cy="200" rx="4.5" ry="10" fill="none" stroke="#fff4c8" stroke-width="0.5" opacity="0.8"/>' +
                // Pupil — sharp-edged deep black vertical ellipse. The
                // defining feature of a dragon eye.
                '<ellipse class="au-pupil" id="auPupil" cx="200" cy="200" rx="2.8" ry="9" fill="#000000"/>' +
                // Specular highlight — small bright off-center dot that
                // makes the eye look wet and alive
                '<ellipse class="au-eye-bright" cx="201.5" cy="195" rx="0.9" ry="1.6" fill="#ffffff" opacity="0.95"/>' +
                // Upper brow ridge — thin dark arc above the eye, adds
                // gravity without aggression. Subtle.
                '<path class="au-brow" d="M 184 148 Q 200 140, 216 148" fill="none" stroke="#1a0f05" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>' +
                // Lens-opening outline — pointed top and bottom, not
                // rounded almond. This shape is what makes it read as
                // dragon rather than cat/snake.
                '<path class="au-eye-outline" d="M 200 152 Q 180 200, 200 248 Q 220 200, 200 152 Z" fill="none" stroke="rgba(245,238,204,0.9)" stroke-width="1.4" stroke-linejoin="round"/>' +
              '</g>' +
            '</g>' +
          '</svg>' +
        '</div>' +
      '</div>' +
      '<div class="aurelius-dialogue-box" id="aureliusDialogueBox">' +
        '<div class="aurelius-box-corners">' +
          '<span class="aurelius-corner aurelius-corner-tl"></span>' +
          '<span class="aurelius-corner aurelius-corner-tr"></span>' +
          '<span class="aurelius-corner aurelius-corner-bl"></span>' +
          '<span class="aurelius-corner aurelius-corner-br"></span>' +
        '</div>' +
        '<div class="aurelius-speaker" id="aureliusSpeaker">Aurelius</div>' +
        '<div class="aurelius-text" id="aureliusText"></div>' +
        '<div class="aurelius-footer">' +
          '<div class="aurelius-progress" id="aureliusProgress"></div>' +
          '<button class="aurelius-continue" id="aureliusContinue">Continue</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlayEl);

    dialogueTextEl = document.getElementById('aureliusText');
    speakerNameEl = document.getElementById('aureliusSpeaker');
    progressEl = document.getElementById('aureliusProgress');
    continueBtn = document.getElementById('aureliusContinue');
    sigilEl = document.getElementById('aureliusSigilWrap');
  }

  function bindEvents(){
    // Summon button click — re-invoke Aurelius
    summonEl.addEventListener('click', function(){
      if(isOpen) return;
      Aurelius.summon();
    });

    // Continue button — advance dialogue
    continueBtn.addEventListener('click', advanceDialogue);

    // Close button
    var closeBtn = overlayEl.querySelector('.aurelius-close');
    closeBtn.addEventListener('click', dismiss);

    // Tap-to-skip: if typewriter is running, tapping the dialogue box
    // (or the overlay background) completes the current line instantly.
    var dialogueBox = document.getElementById('aureliusDialogueBox');
    dialogueBox.addEventListener('click', function(e){
      // Don't intercept clicks on the continue button.
      if(e.target === continueBtn || continueBtn.contains(e.target)) return;
      completeCurrentTyping();
    });

    // ESC to dismiss
    document.addEventListener('keydown', function(e){
      if(!isOpen) return;
      if(e.key === 'Escape') dismiss();
      else if(e.key === 'Enter' || e.key === ' '){
        if(typewriterTimeout){
          completeCurrentTyping();
        } else {
          advanceDialogue();
        }
      }
    });
  }

  // ==================================================================
  // Dialogue rendering
  // ==================================================================

  function renderDialogueLine(){
    var line = config.script[dialogueIndex];
    if(!line){ dismiss(); return; }

    speakerNameEl.textContent = line.speaker || 'Aurelius';
    progressEl.textContent = (dialogueIndex + 1) + ' / ' + config.script.length;

    // Continue button shows "Continue" or "Close" on last line.
    continueBtn.textContent = (dialogueIndex === config.script.length - 1) ? 'Close' : 'Continue';
    continueBtn.style.visibility = 'hidden'; // hidden until typing completes

    typeOut(line.text, function(){
      continueBtn.style.visibility = 'visible';
    });
  }

  function typeOut(text, onComplete){
    dialogueTextEl.textContent = '';
    var i = 0;
    var speed = 24; // ms per character

    currentTypingFullText = text;
    currentTypingCompletion = onComplete;

    function tick(){
      if(i >= text.length){
        currentTypingFullText = '';
        currentTypingCompletion = null;
        typewriterTimeout = null;
        if(onComplete) onComplete();
        return;
      }
      dialogueTextEl.textContent += text.charAt(i);
      i++;
      typewriterTimeout = setTimeout(tick, speed);
    }
    tick();
  }

  function completeCurrentTyping(){
    if(!typewriterTimeout) return;
    clearTimeout(typewriterTimeout);
    typewriterTimeout = null;
    if(currentTypingFullText){
      dialogueTextEl.textContent = currentTypingFullText;
    }
    var cb = currentTypingCompletion;
    currentTypingFullText = '';
    currentTypingCompletion = null;
    if(cb) cb();
  }

  function advanceDialogue(){
    dialogueIndex++;
    if(dialogueIndex >= config.script.length){
      dismiss();
      return;
    }
    renderDialogueLine();
  }

  function dismiss(){
    // Cancel any in-flight typing.
    if(typewriterTimeout){
      clearTimeout(typewriterTimeout);
      typewriterTimeout = null;
    }
    currentTypingFullText = '';
    currentTypingCompletion = null;

    overlayEl.classList.remove('active');
    document.body.classList.remove('aurelius-active');
    isOpen = false;
    dialogueIndex = 0;

    // Stop ambient systems. Eye tracking stays active behind the scenes
    // (its follow loop no-ops when !isOpen); particles need explicit
    // cleanup so we don't leak nodes.
    stopParticles();

    // If a one-off script was swapped in, restore the original.
    if(config._restoreScriptOnDismiss){
      config.script = config._restoreScriptOnDismiss;
      config._restoreScriptOnDismiss = null;
    }
  }

  // ==================================================================
  // Styles — injected once on init
  // ==================================================================

  function injectStyles(){
    if(document.getElementById('aurelius-styles')) return;
    var style = document.createElement('style');
    style.id = 'aurelius-styles';
    style.textContent =
      // Summon button — persistent sigil in bottom-right corner
      '.aurelius-summon{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:rgba(13,10,4,0.8);border:1px solid rgba(229,197,116,0.45);cursor:pointer;padding:0;z-index:90;transition:all 0.3s;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:aurelius-summon-breathe 4.5s ease-in-out infinite}' +
      '.aurelius-summon:hover{border-color:rgba(229,197,116,0.85);background:rgba(25,18,8,0.9);transform:scale(1.08);box-shadow:0 0 24px rgba(229,197,116,0.35)}' +
      '.aurelius-summon-sigil{width:44px;height:44px}' +
      '@keyframes aurelius-summon-breathe{0%,100%{box-shadow:0 0 12px rgba(229,197,116,0.2)}50%{box-shadow:0 0 18px rgba(229,197,116,0.4)}}' +

      // Overlay — full screen, hidden by default
      '.aurelius-overlay{position:fixed;inset:0;z-index:300;opacity:0;pointer-events:none;transition:opacity 0.5s ease}' +
      '.aurelius-overlay.active{opacity:1;pointer-events:auto}' +
      '.aurelius-overlay-bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(40,25,10,0.7) 0%,rgba(8,6,3,0.95) 70%);backdrop-filter:blur(12px)}' +

      // Close button
      '.aurelius-close{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:transparent;border:1px solid rgba(229,197,116,0.35);color:rgba(245,238,204,0.7);font-size:22px;cursor:pointer;transition:all 0.2s;z-index:10;display:flex;align-items:center;justify-content:center}' +
      '.aurelius-close:hover{border-color:rgba(229,197,116,0.75);color:rgba(245,238,204,1);background:rgba(229,197,116,0.1)}' +

      // Stage — holds the sigil
      '.aurelius-stage{position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);width:400px;height:400px;display:flex;align-items:center;justify-content:center}' +
      '@media(max-width:640px){.aurelius-stage{width:300px;height:300px;transform:translate(-50%,-60%)}}' +

      // Ambient aura — warm firelight glow behind the sigil
      '.aurelius-aura{position:absolute;top:50%;left:50%;width:480px;height:480px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(229,197,116,0.22) 0%,rgba(205,127,50,0.1) 40%,transparent 70%);animation:aurelius-aura-breathe 5s ease-in-out infinite}' +
      '@keyframes aurelius-aura-breathe{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(0.96)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}}' +

      // Sigil wrap — the container that floats
      '.aurelius-sigil-wrap{position:absolute;top:50%;left:50%;width:400px;height:400px;transform:translate(-50%,-50%);animation:aurelius-float 7s ease-in-out infinite;opacity:0.92}' +
      '@media(max-width:640px){.aurelius-sigil-wrap{width:300px;height:300px}}' +
      '@keyframes aurelius-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-6px)}}' +

      // Sigil inner glow
      '.aurelius-sigil-glow{position:absolute;top:50%;left:50%;width:280px;height:280px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(245,238,204,0.32) 0%,rgba(229,197,116,0.14) 50%,transparent 70%);animation:aurelius-glow-breathe 4.5s ease-in-out infinite}' +
      '@keyframes aurelius-glow-breathe{0%,100%{transform:translate(-50%,-50%) scale(0.95);opacity:0.65}50%{transform:translate(-50%,-50%) scale(1.14);opacity:1}}' +

      '.aurelius-sigil{width:100%;height:100%;position:relative;z-index:2}' +

      // ORBITAL RING ROTATIONS — slower than Guide's but clearly visible.
      // Inner rings spin faster (shorter period); outer rings drift more
      // slowly. Alternating directions give a counter-rotation that reads
      // as active without being frantic.
      '.au-orbit{transform-origin:200px 200px}' +
      '.au-orbit-1{animation:au-rot-cw 48s linear infinite}' +
      '.au-orbit-2{animation:au-rot-ccw 38s linear infinite}' +
      '.au-orbit-3{animation:au-rot-cw 30s linear infinite}' +
      '.au-orbit-4{animation:au-rot-ccw 26s linear infinite}' +
      '.au-orbit-5{animation:au-rot-cw 22s linear infinite}' +
      '@keyframes au-rot-cw{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes au-rot-ccw{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}' +

      // Runic marks — perimeter stud rotation. Speeded up from 180s to
      // 90s so the slow collective drift is perceptible.
      '.au-runes{transform-origin:200px 200px;animation:au-rot-ccw 90s linear infinite}' +

      // Anchor lines — subtle pulse
      '.au-thread{animation:au-thread-pulse 8s ease-in-out infinite}' +
      '@keyframes au-thread-pulse{0%,100%{opacity:0.5}50%{opacity:0.85}}' +

      // Eye — periodic slow blink. For a vertical slit eye, a blink
      // scales the Y axis down, mimicking an upper and lower lid meeting
      // at the horizontal center line (not scaling X like a normal eye).
      '.au-eye{transform-origin:200px 200px;animation:au-breath 4.5s ease-in-out infinite}' +
      '@keyframes au-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}' +
      '.au-eye-lids{transform-origin:200px 200px;animation:au-blink 11s ease-in-out infinite}' +
      '@keyframes au-blink{' +
        '0%,47%,53%,100%{transform:scaleY(1)}' +
        '50%{transform:scaleY(0.05)}' +
      '}' +

      // Pupil drift is now driven by JS eye-tracking (startEyeTracking),
      // which makes the pupil follow the cursor with idle drift fallback.
      // The old CSS-keyframe drift has been removed to avoid the CSS
      // animation fighting the JS-set inline transform.

      // FLAME FLICKER — each flame has a slight scale + skew animation
      // to suggest draft-induced motion. Different timings on each flame
      // so they don't sync up into a weird coordinated pulse. Scale the
      // Y axis more than the X (flames flicker vertically more than they
      // sway horizontally) and keep scale values close to 1 so the
      // overall silhouette stays stable.
      '.au-hearth{transform-origin:200px 273px;animation:au-flame-hearth 2.4s ease-in-out infinite}' +
      '@keyframes au-flame-hearth{' +
        '0%,100%{transform:scaleY(1) scaleX(1)}' +
        '25%{transform:scaleY(1.06) scaleX(0.96)}' +
        '50%{transform:scaleY(0.96) scaleX(1.04)}' +
        '75%{transform:scaleY(1.03) scaleX(0.98)}' +
      '}' +
      '.au-candle-top{transform-origin:200px 48px;animation:au-flame-candle-1 2.1s ease-in-out infinite}' +
      '.au-candle-bl{transform-origin:90px 288px;animation:au-flame-candle-2 2.7s ease-in-out infinite}' +
      '.au-candle-br{transform-origin:310px 288px;animation:au-flame-candle-3 2.3s ease-in-out infinite}' +
      '@keyframes au-flame-candle-1{' +
        '0%,100%{transform:scaleY(1) scaleX(1)}' +
        '30%{transform:scaleY(1.08) scaleX(0.94)}' +
        '60%{transform:scaleY(0.94) scaleX(1.05)}' +
      '}' +
      '@keyframes au-flame-candle-2{' +
        '0%,100%{transform:scaleY(1) scaleX(1)}' +
        '40%{transform:scaleY(0.95) scaleX(1.04)}' +
        '70%{transform:scaleY(1.07) scaleX(0.96)}' +
      '}' +
      '@keyframes au-flame-candle-3{' +
        '0%,100%{transform:scaleY(1) scaleX(1)}' +
        '35%{transform:scaleY(1.06) scaleX(0.97)}' +
        '65%{transform:scaleY(0.95) scaleX(1.03)}' +
      '}' +

      // Dialogue box — anchored lower portion of screen
      '.aurelius-dialogue-box{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:min(92%,620px);background:rgba(13,10,4,0.88);border:1px solid rgba(229,197,116,0.4);border-radius:5px;padding:22px 26px 18px;backdrop-filter:blur(20px);box-shadow:0 0 40px rgba(229,197,116,0.15)}' +

      // Corner decorations
      '.aurelius-box-corners{position:absolute;inset:0;pointer-events:none}' +
      '.aurelius-corner{position:absolute;width:10px;height:10px;border-color:rgba(229,197,116,0.65)}' +
      '.aurelius-corner-tl{top:-1px;left:-1px;border-top:1px solid;border-left:1px solid}' +
      '.aurelius-corner-tr{top:-1px;right:-1px;border-top:1px solid;border-right:1px solid}' +
      '.aurelius-corner-bl{bottom:-1px;left:-1px;border-bottom:1px solid;border-left:1px solid}' +
      '.aurelius-corner-br{bottom:-1px;right:-1px;border-bottom:1px solid;border-right:1px solid}' +

      '.aurelius-speaker{font-family:"Cinzel",serif;font-size:11px;letter-spacing:.22em;color:rgba(229,197,116,0.9);text-transform:uppercase;margin-bottom:10px}' +
      '.aurelius-text{font-family:"Crimson Pro",serif;font-size:17px;line-height:1.65;color:rgba(245,238,228,0.92);min-height:60px}' +
      '.aurelius-footer{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid rgba(229,197,116,0.15)}' +
      '.aurelius-progress{font-family:"DM Sans",sans-serif;font-size:11px;color:rgba(245,238,204,0.45);letter-spacing:.1em}' +
      '.aurelius-continue{font-family:"Cinzel",serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;background:linear-gradient(180deg,rgba(229,197,116,0.2),rgba(229,197,116,0.08));border:1px solid rgba(229,197,116,0.5);color:rgba(245,238,204,0.95);padding:8px 18px;border-radius:3px;cursor:pointer;transition:all 0.25s}' +
      '.aurelius-continue:hover{background:linear-gradient(180deg,rgba(229,197,116,0.3),rgba(229,197,116,0.14));border-color:rgba(229,197,116,0.75);color:#fff4c8;box-shadow:0 0 20px rgba(229,197,116,0.25)}' +

      '@media(max-width:640px){' +
        '.aurelius-dialogue-box{padding:18px 20px 14px;bottom:20px}' +
        '.aurelius-text{font-size:15px}' +
      '}';
    document.head.appendChild(style);
  }

  // ==================================================================
  // PARTICLE SYSTEM — rising embers
  // Ambient golden embers drift up from the hearth and the three anchor
  // candles while Aurelius is visible. Each particle is an SVG circle
  // that travels a curved upward path, fades out, and respawns. Runs
  // on requestAnimationFrame so timing stays smooth across frame rates.
  //
  // Particles live at 4 source points:
  //   - Hearth (central flame, ~y=270)  — denser source
  //   - Top anchor candle (200, 48)
  //   - Bottom-left candle (90, 288)
  //   - Bottom-right candle (310, 288)
  //
  // Plus occasional rune sparks — one of the 7 perimeter marks pulses
  // a single spark outward now and then. Rarer than the ember drift.
  // ==================================================================

  var particlesActive = false;
  var particles = []; // live particle objects
  var particleLayer = null;

  // Particle source definitions — where embers spawn from.
  // `rate` controls emission probability per frame (not absolute rate,
  // but the chance a new particle spawns when one is needed).
  var EMBER_SOURCES = [
    // The hearth — primary flame, most embers
    { x: 200, y: 262, targetCount: 5, spreadX: 4,  drift: -1.2 },
    // Top anchor candle
    { x: 200, y: 42,  targetCount: 2, spreadX: 2,  drift: -1.0 },
    // Bottom-left candle
    { x: 90,  y: 280, targetCount: 2, spreadX: 2,  drift: -0.8 },
    // Bottom-right candle
    { x: 310, y: 280, targetCount: 2, spreadX: 2,  drift: -0.8 }
  ];

  function startParticles(){
    if(particlesActive) return;
    particlesActive = true;
    particleLayer = document.getElementById('auParticles');
    if(!particleLayer) return;

    // Clear any leftover particles from previous summons
    while(particleLayer.firstChild) particleLayer.removeChild(particleLayer.firstChild);
    particles = [];

    // Kick off the animation loop
    requestAnimationFrame(particleLoop);

    // Rune sparks — lower frequency, scheduled independently
    scheduleRuneSpark();
  }

  function stopParticles(){
    particlesActive = false;
    if(particleLayer){
      while(particleLayer.firstChild) particleLayer.removeChild(particleLayer.firstChild);
    }
    particles = [];
  }

  function spawnEmber(source){
    var svgNS = 'http://www.w3.org/2000/svg';
    var circle = document.createElementNS(svgNS, 'circle');

    // Jitter the start position slightly around the source for natural look
    var startX = source.x + (Math.random() - 0.5) * 2;
    var startY = source.y + (Math.random() - 0.5) * 2;

    circle.setAttribute('cx', startX);
    circle.setAttribute('cy', startY);
    circle.setAttribute('r', 0.8 + Math.random() * 1.2); // 0.8-2px
    circle.setAttribute('fill', '#fff4c8');
    circle.setAttribute('opacity', 0);
    circle.setAttribute('filter', 'url(#aureliusFlameGlow)');
    particleLayer.appendChild(circle);

    return {
      el: circle,
      source: source,
      // Motion state
      startX: startX,
      startY: startY,
      x: startX,
      y: startY,
      // Drift trajectory — slight horizontal sway as it rises
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 3 + Math.random() * 4,
      swayFreq: 0.8 + Math.random() * 0.5,
      // Vertical rise speed — in SVG units per second (negative = up)
      riseSpeed: 14 + Math.random() * 10, // 14-24 units/sec
      // Horizontal drift (small bias from source, mostly centered)
      driftX: (Math.random() - 0.5) * source.spreadX,
      // Lifetime
      age: 0,
      maxAge: 2200 + Math.random() * 1400, // 2.2-3.6 sec
      baseR: 0.8 + Math.random() * 1.2
    };
  }

  function particleLoop(){
    if(!particlesActive) return;

    var now = performance.now();
    if(!particleLoop.lastTime) particleLoop.lastTime = now;
    var dt = (now - particleLoop.lastTime) / 1000; // seconds
    particleLoop.lastTime = now;
    if(dt > 0.1) dt = 0.1; // clamp if tab was backgrounded

    // Maintain target particle count per source — respawn as they expire
    EMBER_SOURCES.forEach(function(source){
      var activeFromSource = particles.filter(function(p){ return p.source === source; }).length;
      while(activeFromSource < source.targetCount){
        var newP = spawnEmber(source);
        // Stagger new particles with random initial age so they don't all
        // bunch up at the source when the system starts
        if(!startParticles.initialized){
          newP.age = Math.random() * newP.maxAge;
        }
        particles.push(newP);
        activeFromSource++;
      }
    });
    startParticles.initialized = true;

    // Update each particle
    for(var i = particles.length - 1; i >= 0; i--){
      var p = particles[i];
      p.age += dt * 1000;

      if(p.age >= p.maxAge){
        if(p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        particles.splice(i, 1);
        continue;
      }

      var t = p.age / p.maxAge; // 0 to 1

      // Vertical rise (embers go up)
      p.y = p.startY - p.riseSpeed * (p.age / 1000);

      // Horizontal sway — sinusoidal, decreases in amplitude as particle
      // rises higher (embers stabilize as they rise)
      var swayDecay = 1 - t * 0.5;
      var sway = Math.sin(p.swayPhase + (p.age / 1000) * p.swayFreq) * p.swayAmp * swayDecay;
      p.x = p.startX + p.driftX + sway;

      // Opacity — fade in quickly, hold, fade out slowly
      var opacity;
      if(t < 0.1) opacity = t / 0.1;
      else if(t < 0.6) opacity = 1 - (t - 0.1) * 0.2; // slow dim in middle
      else opacity = Math.max(0, 0.9 - (t - 0.6) * 2.25);

      // Color temperature — starts warm gold, fades to cream as it cools
      // (real embers: yellow-hot at base, cooler orange at top, fading)
      // We'll just fade opacity; color stays cream-gold via the fill.

      // Size — slightly shrink as it rises (heat dispersing)
      var r = p.baseR * (1 - t * 0.3);

      p.el.setAttribute('cx', p.x.toFixed(2));
      p.el.setAttribute('cy', p.y.toFixed(2));
      p.el.setAttribute('r', r.toFixed(2));
      p.el.setAttribute('opacity', opacity.toFixed(3));
    }

    requestAnimationFrame(particleLoop);
  }

  // Rune sparks — one of the 7 runic marks occasionally emits a single
  // spark that drifts outward briefly before fading. Much less frequent
  // than embers — adds occasional accent without overwhelming.
  function scheduleRuneSpark(){
    if(!particlesActive) return;
    var delay = 2200 + Math.random() * 4500; // 2.2-6.7 seconds
    setTimeout(function(){
      if(!particlesActive) return;
      fireRuneSpark();
      scheduleRuneSpark();
    }, delay);
  }

  function fireRuneSpark(){
    if(!particleLayer) return;
    // Pick a random rune (7 runes, angles 0, 51.4, 102.8, 154.2, 205.6, 257, 308.4)
    var angles = [0, 51.4, 102.8, 154.2, 205.6, 257, 308.4];
    var angleDeg = angles[Math.floor(Math.random() * angles.length)];
    var angleRad = angleDeg * Math.PI / 180;
    // Rune sits at radius 160 in sigil space
    var cx = 200 + Math.cos(angleRad) * 160;
    var cy = 200 + Math.sin(angleRad) * 160;

    var svgNS = 'http://www.w3.org/2000/svg';
    var circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', 1.5);
    circle.setAttribute('fill', '#fff4c8');
    circle.setAttribute('opacity', 0);
    circle.setAttribute('filter', 'url(#aureliusFlameGlow)');
    particleLayer.appendChild(circle);

    // Spark drifts outward from rune, fades
    var dirX = Math.cos(angleRad);
    var dirY = Math.sin(angleRad);
    var startTime = performance.now();
    var duration = 1100;

    function animate(now){
      var elapsed = now - startTime;
      var t = elapsed / duration;
      if(t >= 1){
        if(circle.parentNode) circle.parentNode.removeChild(circle);
        return;
      }
      var dist = t * 14; // drifts 14 units outward
      var x = cx + dirX * dist;
      var y = cy + dirY * dist;
      var op;
      if(t < 0.2) op = t / 0.2;
      else op = 1 - (t - 0.2) / 0.8;
      var r = 1.5 * (1 - t * 0.4);
      circle.setAttribute('cx', x.toFixed(2));
      circle.setAttribute('cy', y.toFixed(2));
      circle.setAttribute('r', r.toFixed(2));
      circle.setAttribute('opacity', op.toFixed(3));
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // ==================================================================
  // EYE TRACKING — dragon eye follows cursor, idles with gentle drift
  // Adapted from Guide's pattern. The vertical slit pupil has
  // constrained horizontal range (narrower iris) but full vertical
  // range. When the user stops moving the cursor, the pupil drifts
  // slowly in an idle pattern so the eye never appears frozen.
  // ==================================================================

  var eyeTrackingActive = false;
  var pupilTargetX = 0, pupilTargetY = 0;
  var pupilCurrentX = 0, pupilCurrentY = 0;
  var lastMouseMoveTime = 0;
  var EYE_IDLE_TIMEOUT_MS = 1500;

  function startEyeTracking(){
    if(eyeTrackingActive) return;
    eyeTrackingActive = true;

    var svgEl = null;
    function getSvg(){
      if(!svgEl) svgEl = document.querySelector('.aurelius-sigil');
      return svgEl;
    }

    document.addEventListener('mousemove', function(e){
      if(!isOpen) return;
      var svg = getSvg();
      if(!svg) return;
      lastMouseMoveTime = Date.now();
      var rect = svg.getBoundingClientRect();
      var svgCenterX = rect.left + rect.width / 2;
      var svgCenterY = rect.top + rect.height / 2;
      var dx = e.clientX - svgCenterX;
      var dy = e.clientY - svgCenterY;
      var scaleX = 400 / rect.width;
      var scaleY = 400 / rect.height;
      var targetX = dx * scaleX;
      var targetY = dy * scaleY;

      // Vertical slit pupil: narrower X range (iris is 11 wide), fuller Y
      // range (iris is 22 tall). Max travel: x=±2, y=±6.
      var maxRangeX = 2;
      var maxRangeY = 6;

      var dist = Math.sqrt(targetX * targetX + targetY * targetY);
      if(dist > 0){
        // Normalize then scale by the elliptical eye range
        var nx = targetX / dist;
        var ny = targetY / dist;
        var eased = Math.min(dist / 150, 1);
        pupilTargetX = nx * maxRangeX * eased;
        pupilTargetY = ny * maxRangeY * eased;
      } else {
        pupilTargetX = 0;
        pupilTargetY = 0;
      }
    });

    // Idle drift — two overlapping sine waves at different frequencies
    // create gentle organic wandering. Constrained to same elliptical
    // range as the cursor tracking.
    function computeIdleTarget(){
      var t = Date.now() / 1000;
      var x = Math.sin(t * 0.35) * 1.0 + Math.sin(t * 0.17) * 0.5;
      var y = Math.cos(t * 0.29) * 2.5 + Math.sin(t * 0.13) * 1.2;
      return { x: x, y: y };
    }

    // Smooth follow loop — lerps current position toward target
    function followLoop(){
      if(!eyeTrackingActive){
        requestAnimationFrame(followLoop);
        return;
      }
      var pupil = document.getElementById('auPupil');
      if(pupil && isOpen){
        var now = Date.now();
        var isIdle = (now - lastMouseMoveTime) > EYE_IDLE_TIMEOUT_MS;
        var tx, ty;
        if(isIdle){
          var idle = computeIdleTarget();
          tx = idle.x;
          ty = idle.y;
        } else {
          tx = pupilTargetX;
          ty = pupilTargetY;
        }
        // Faster lerp when tracking, slower when drifting (calmer feel)
        var lerp = isIdle ? 0.04 : 0.09;
        pupilCurrentX += (tx - pupilCurrentX) * lerp;
        pupilCurrentY += (ty - pupilCurrentY) * lerp;
        pupil.style.transform = 'translate(' + pupilCurrentX.toFixed(2) + 'px,' + pupilCurrentY.toFixed(2) + 'px)';
      }
      requestAnimationFrame(followLoop);
    }
    requestAnimationFrame(followLoop);
  }

  global.Aurelius = Aurelius;
})(typeof window !== 'undefined' ? window : this);
