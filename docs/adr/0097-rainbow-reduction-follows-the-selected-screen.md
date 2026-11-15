# ADR 0097: Rainbow reduction follows the selected screen

- Status: Accepted
- Date: 2026-11-15
- Amends: [ADR 0037](0037-image-options-color-follows-the-device.md)

Rainbow reduction changes grayscale pages too. An option left on for a color e-reader can therefore change the next book after the person selects a monochrome e-reader. [KCC disables it on that switch](https://github.com/ciromattia/kcc/pull/1500).

Choosing a monochrome profile in the queue or in conversion options turns off rainbow reduction. Color profiles keep the previous choice, including the color reMarkable profiles. The custom profile and fixed resolutions also keep it because dimensions alone do not identify the screen. The control remains available for manual use. Saved settings retain their values when loaded.
