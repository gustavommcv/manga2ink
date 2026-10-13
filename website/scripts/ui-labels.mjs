/**
 * What a guide of the app calls a button, a switch or a section is written in bold, and is the
 * name the interface shows. Each is checked against the text of the app, so that a label that was
 * renamed does not stay in a guide as something a person will look for and not find.
 */

/** The bold phrases of a page, in the order they appear. Links and code are not emphasis. */
export function boldPhrases(text) {
  const withoutCode = text.replace(/```[\s\S]*?```/gu, '').replace(/`[^`\n]*`/gu, '');
  return [...withoutCode.matchAll(/\*\*([^*\n]+?)\*\*/gu)].map((match) => match[1].trim());
}

/** Quotes as the guides and the interface write them, which are not always the same ones. */
export function plain(text) {
  return text.replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"').replace(/\s+/gu, ' ');
}

/**
 * Whether a phrase of a guide is not the name of something in the interface, and so is left alone:
 * a menu path of another program, an address or a file name, a sentence that is emphasized (it ends
 * with a full stop), or a link.
 */
export function isNotALabel(phrase) {
  return (
    phrase.includes('→') ||
    phrase.startsWith('[') ||
    /[/\\]|\.\w{1,4}$/u.test(phrase) ||
    /[.!?]$/u.test(phrase) ||
    phrase.split(' ').length > 9
  );
}

/**
 * The phrases of the page that are in none of the interface's text, less the ones a guide says on
 * purpose are something else (`allowed`, each with the reason it is there).
 */
export function missingLabels(text, interfaceText, allowed = new Set()) {
  const known = plain(interfaceText);
  return [
    ...new Set(
      boldPhrases(text).filter(
        (phrase) => !isNotALabel(phrase) && !allowed.has(phrase) && !known.includes(plain(phrase)),
      ),
    ),
  ];
}
