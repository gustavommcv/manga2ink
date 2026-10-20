/**
 * What the accessibility scan of the pages does not hold against them: one thing, said here with its
 * reason, so that it is a decision and not a habit.
 *
 * The search button of Starlight has the name "Search" (`aria-label`) and shows that word, and a hint
 * of its shortcut, "Ctrl K", beside it. From axe 4.14 the rule `label-content-name-mismatch`, which is
 * no longer experimental, says the visible text, which includes the hint, is not in the name. Starlight
 * answered that the hint is not the label: a person who says "click Search" matches the name, the
 * hint is read as `aria-keyshortcuts`, and the WCAG's own text says symbolic text is not a visible label
 * (https://github.com/withastro/starlight/issues/4260,
 * https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html#symbolic-text-characters). Putting the
 * hint in the name would have a screen reader say it twice, and taking the name away leaves the button
 * with none on a narrow screen. The rule is still being discussed for the WCAG's conformance tests and
 * axe has a bug in how it joins the visible text (dequelabs/axe-core#5458).
 *
 * Take it out when Starlight or axe change what they say, or when the rule is settled.
 */
const searchButtonRule = 'label-content-name-mismatch';

/** The one button, as axe names it: `button[data-open-modal=""]` for the attribute with no value. */
const isTheSearchButton = (node) =>
  node.target.length === 1 && /^button\[data-open-modal(?:=""?)?\]$/u.test(String(node.target[0]));

/**
 * The violations of a scan, without the search button of Starlight under that one rule. Any other
 * element under it, and that button under any other rule, is still held against the page.
 */
export function withoutKnownFalsePositives(violations) {
  return violations
    .map((violation) =>
      violation.id === searchButtonRule
        ? { ...violation, nodes: violation.nodes.filter((node) => !isTheSearchButton(node)) }
        : violation,
    )
    .filter((violation) => violation.nodes.length > 0);
}
