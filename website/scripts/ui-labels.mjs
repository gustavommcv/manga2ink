/**
 * What a guide of the app calls a button, a switch or a section is written in bold, and is the
 * name the interface shows in the language of the guide. Each is checked against the text of the
 * app in that language, so that a label that was renamed does not stay in a guide as something a
 * person will look for and not find, and a guide in Portuguese names a button as the app in
 * Portuguese does.
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
 * with a full stop, as written in any of the languages of the guide), or a link.
 */
export function isNotALabel(phrase) {
  return (
    phrase.includes('→') ||
    phrase.startsWith('[') ||
    /[/\\]|\.\w{1,4}$/u.test(phrase) ||
    /[.!?。！？]$/u.test(phrase) ||
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

/**
 * What each language says in a source of the app that has its words in catalogs (`src/i18n`): a
 * catalog is an object with one entry for each language at the top, `en: {` and `'pt-BR': {`, and
 * what a language says is from its entry to the next one. What comes before the first entry (the
 * types, and the comments that describe them) is no language's words and is left out. A source with
 * no entry of that kind has none, and the map is empty.
 */
export function sectionsOf(source, tags) {
  const marker = new RegExp(`^  (?:'(${tags.join('|')})'|(${tags.join('|')})): [{(]`, 'gmu');
  const starts = [...source.matchAll(marker)].map((match) => ({
    tag: match[1] ?? match[2],
    at: match.index,
  }));
  const sections = new Map();
  for (const [index, { tag, at }] of starts.entries()) {
    const text = source.slice(at, starts[index + 1]?.at);
    sections.set(tag, `${sections.get(tag) ?? ''}\n${text}`);
  }
  return sections;
}

/**
 * What the interface says in a language: the words that the app's catalogs have for it, and the text
 * of everything that is not a catalog (a name written in a component is the same in every language).
 * A language the app does not have yet says what English says, which is what a guide of it names the
 * controls by until the app is translated.
 */
export function interfaceTextFor(tag, sources, tags, fallback = 'en') {
  return sources
    .map((source) => {
      const sections = sectionsOf(source, tags);
      if (sections.size === 0) return source;
      return sections.get(tag) ?? sections.get(fallback) ?? '';
    })
    .join('\n');
}
