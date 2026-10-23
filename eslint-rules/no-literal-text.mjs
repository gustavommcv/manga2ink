// ADR 0052: the text the window shows is in the catalogs of `src/i18n`, one for each language the
// app has, and not written in the components. This rule refuses text that is written in the JSX of
// a component, where it would be the same in every language and nothing would say it was missed:
//
//   <h1>Queue</h1>                         text between tags
//   <h1>{'Queue'}</h1>                     a string as a child, also in either side of a `? :`
//   <button aria-label="Close">            the attributes that a person reads or hears
//   <Field label="Device" />               and the props that components take a label in
//
// Text with no letter in it (a number, `·`, `×`, `…`, a space written as `{' '}`) is not words. A
// few names are the same in every language and may be written as they are (see `names`), and so
// is the "v" of a version number. What the
// rule does not look at is a string that a function returns, or one in a variable: those are found
// by the catalogs' own tests and by review, and the names of the attributes below are the ones
// that are, in practice, where text is written by hand.

const names = ['v', 'Manga2Ink', 'EPUB', 'CBZ', 'PDF', 'KOReader', 'MangaDex', 'JPmarquesbraga'];

/** Attributes and props whose value is read by a person, or by a screen reader. */
const textAttributes = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'description',
  'detail',
  'label',
  'noneDetail',
  'placeholder',
  'summary',
  'title',
]);

const namePattern = new RegExp(names.join('|'), 'gu');

/** Whether text holds words: a letter that is not part of a name that is not translated. */
function hasWords(text) {
  return /\p{L}/u.test(text.replace(namePattern, ''));
}

/**
 * The text a node writes by hand, or `undefined` when it writes none: a string, the fixed parts of a
 * template, and either branch of a condition or a fallback. A call, a member or a name is not
 * written here (it is read from a catalog, or made from one).
 */
function writtenText(node) {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' && hasWords(node.value) ? node.value : undefined;
    case 'TemplateLiteral': {
      const fixed = node.quasis.map((part) => part.value.cooked ?? '').join(' ');
      return hasWords(fixed) ? fixed.trim() : undefined;
    }
    case 'ConditionalExpression':
      return writtenText(node.consequent) ?? writtenText(node.alternate);
    case 'LogicalExpression':
      return (
        (node.operator === '&&' ? undefined : writtenText(node.left)) ?? writtenText(node.right)
      );
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSSatisfiesExpression':
      return writtenText(node.expression);
    default:
      return undefined;
  }
}

/** A few words of the text, for the message. */
function excerpt(text) {
  const oneLine = text.replace(/\s+/gu, ' ').trim();
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine;
}

export const noLiteralText = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      text: 'Text the window shows goes in a catalog of src/i18n, for every language (ADR 0052), not in the component: "{{text}}".',
    },
  },
  create(context) {
    const report = (node, text) => {
      context.report({ node, messageId: 'text', data: { text: excerpt(text) } });
    };

    return {
      JSXText(node) {
        if (hasWords(node.value)) report(node, node.value);
      },
      JSXExpressionContainer(node) {
        // The value of an attribute is looked at with its attribute, below.
        if (node.parent.type === 'JSXAttribute') return;
        if (node.expression.type === 'JSXEmptyExpression') return;
        const text = writtenText(node.expression);
        if (text !== undefined) report(node, text);
      },
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : undefined;
        if (name === undefined || !textAttributes.has(name) || node.value === null) return;
        const value =
          node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
        if (value.type === 'JSXEmptyExpression') return;
        const text = writtenText(value);
        if (text !== undefined) report(node.value, text);
      },
    };
  },
};
