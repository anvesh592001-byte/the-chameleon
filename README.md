# The Chameleon — Master of Adaptation

An immersive editorial field study of the chameleon, built as a single continuous
story in eight sections. Premium wildlife documentary meets editorial magazine:
full-screen footage, dramatic typographic hierarchy, and scroll motion that
reverses when you scroll back up.

**Live:** https://the-chameleon-anvesh-s-projects1.vercel.app

---

## What it is

| | |
|---|---|
| **Stack** | Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies. |
| **Film** | Cloudinary — `cloudName: hitdvpiy`, `publicId: mixkit-green-vailed-chameleon-seen-from-one-side-1489-full-hd` |
| **Imagery** | Nine original photographic assets, self-hosted, ~1.3 MB total |
| **Type** | Archivo, Fraunces and JetBrains Mono — self-hosted WOFF2, no external font requests |
| **Hosting** | Vercel (static, `outputDirectory: .`) |

## The hero

The footage is a tight macro of a veiled chameleon: head and eye fill the upper
centre-right, the body arcs in from the left edge. Before writing any layout,
frame luminance and edge-energy were measured frame by frame. The only genuine
negative space is the **lower-left quadrant** — soft, out of focus, and dark.

So the headline is placed there, on purpose:

- measured ivory-on-footage contrast in that zone: **9.2 : 1** desktop, **12.7 : 1** mobile
- the scrims exist **only** over that quadrant and the very top edge
- on landscape viewports the film fills the screen (`object-fit: cover`);
  on portrait screens it becomes a 16 : 9 letterbox strip so the head stays
  whole and the type keeps its own safe band below
- nothing is ever drawn over the face, the eye, or the body

## Scroll motion

Reversibility is structural, not patched on. A single `IntersectionObserver`
toggles `.is-in` / `.is-out` on every animated element, so each CSS transition
runs forwards on entry and **backwards** on exit — same property, same curve.
Exit uses a slightly faster, inward easing so leaving reads as deliberate.
Staggered groups reverse their delay order so exits collapse toward the group
origin instead of unwinding from the top.

Parallax runs in one `requestAnimationFrame` loop that lerps toward a scroll-derived
target and then idles when it settles — no continuous rendering.

## The film player

No player chrome sits over the subject. Accessibility is preserved instead of
a visible pause button:

- clicking the film plays or pauses it
- it pauses automatically whenever the hero leaves the viewport
- `prefers-reduced-motion` starts it on the poster frame, still and unpaused-loopless
- metred / data-saving connections only fetch metadata and the poster
- if the browser cannot decode the asset, the poster (a real frame of the same
  footage) holds the composition and the tools stand down

`assets/js/main.js` also carries the Cloudinary player initialiser verbatim — if
`window.cloudinary` is ever present, the hero upgrades to the official player:

```js
const player = cloudinary.player('player', {
  cloudName: 'hitdvpiy',
  publicId: 'mixkit-green-vailed-chameleon-seen-from-one-side-1489-full-hd'
});
```

## The interactive eye diagram

In section 03, two turrets aim independently — one reacts quickly, the other
lags — and both **converge** when the pointer enters the frontal wedge, at which
point the readout flips to `CONVERGED · DEPTH LOCK` and the sight lines meet on
the target. Bearing needles rotate on the turret rims; the whole loop only runs
while the diagram is on screen.

## Verified

- 18 viewports from 320 × 700 to 2560 × 1440: no clipped headlines, no text over
  the subject, no horizontal overflow, nothing pushed below the fold
- reverse-scroll audit: every off-screen element returns to its hidden state;
  stable through rapid ping-pong scrolling
- `prefers-reduced-motion`: all 79 animated elements static and visible
- one `h1`, ordered headings, alt text on every image, labelled controls,
  keyboard-navigable, visible focus rings
- render-blocking fonts preloaded and self-hosted; all imagery lazy-loaded
- zero console errors, zero failed requests on production

## Files

```
index.html
assets/css/style.css
assets/js/main.js
assets/fonts/*.woff2        Archivo · Fraunces · JetBrains Mono
assets/img/*                nine photographic assets, poster frame, grain, favicon
```

## Run it

Any static server:

```bash
python3 -m http.server 8000
```

## Notes

Colour-change mechanism after Teyssier et al., "Photonic crystals cause active
colour change in chameleons", *Nature Communications*, 2015. Footage is Mixkit
free stock, delivered through Cloudinary. No statistics were invented.
