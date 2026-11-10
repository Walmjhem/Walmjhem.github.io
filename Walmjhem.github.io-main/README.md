# Jheremie Santos: portfolio

`index.html` is the main page. Every project opens from it.

```
index.html                  portfolio
assets/
  css/  main.css, project-shell.css
  js/   main.js, interactions.js, project-shell.js
  images/  portrait, StayEasy cover
  resume/  Jheremie_Santos_Resume.pdf
projects/
  stockpilot/      shop + admin.html
  crumb-and-co/    shop + owner-admin.html
  skycast/
  counter-pos/
  ashden-manor/
  marci-metzger/
  stayeasy/
```

Each project has its own `index.html`, `css/`, `js/` and `images/`.

## Lead capture
Ashden Manor, Marci Metzger and StayEasy share a small helper, `js/lead.js`. It records UTM tags
and the referrer, sends events to `window.dataLayer`, scores each lead hot / warm / cold, and posts
it to a webhook. To receive real leads, paste a webhook URL (Make, Zapier, Formspree or a CRM form)
into the `endpoint` setting near the top of that project's `js/app.js`. While it is empty, leads
stay in the visitor's browser and nothing is sent.

## Animation
Projects 01-04 keep their animation in `css/motion.css` and `js/motion.js`. Remove those two links
from a project's HTML to turn it off. Animations use `transform` and `opacity` only and switch off
for visitors who prefer reduced motion.

## Project colors
Each project uses its card color from the portfolio page. `project-shell.css` and
`project-shell.js` read `<html data-project="...">` and add the floating "All work" pill, the color
transition on arrival, and the `[` and `]` keys to move between projects.
