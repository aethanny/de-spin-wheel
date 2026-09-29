# Good Spin

## Platform
Responsive web, including mobile browsers.

## Stack
Plain HTML, CSS, and JavaScript, as accepted in the implementation plan. No application dependencies, build step, backend, or authentication. IndexedDB stores browser-local data; serve on localhost or an HTTPS static host.

## Purpose
Let a participant enter their name and spin for a prize. Let the person operating the site configure the prizes, their images and probabilities, and the website palette. A shared event device is the implementation's assumed usage scene; no specific event or organization was supplied.

## Confirmed behavior
- One wheel, four renameable categories containing individually editable prizes.
- Equal visual slices; per-prize winning percentages across the entire wheel must sum to 100% before spinning.
- Name required per spin; anonymous mode stores and displays “Anonymous” without retaining the entered name.
- Browser-local persistence of settings, uploaded images, and result history.
- Playful, colorful starting appearance with editable theme colors.

## Accepted defaults
Eight sample prizes at 12.5% each, two per category. Unlimited repeat spins; winners do not remove prizes. Anyone using the browser may edit settings. No cross-device sync. Save the outcome before animation and preserve historical names when current configuration changes.

## Accessibility
Keyboard-operable native form controls, visible focus, labeled inputs, live result/error feedback, and reduced-motion support. Presets must be readable; custom palette colors are user-controlled.
