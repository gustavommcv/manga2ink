import { ESLint } from 'eslint';

// Proves eslint-rules/no-literal-text.mjs does what it claims (ADR 0052): text that a component
// writes by hand is refused wherever it is written - between tags, as a string or a template in a
// child, on either side of a condition, in the attributes a person reads or hears, and in the props
// that take a label - in any language, Portuguese and Japanese too; and what is not text is
// accepted: what is read from a catalog, the names that are the same in every language, a number or
// a sign, an attribute that is not read, and the stories, which are examples. Each case lints a
// small snippet of real-shaped code at its own virtual path, through the real, loaded
// eslint.config.mjs - nothing here reimplements the rule, only exercises it. The paths are given
// to typescript-eslint's project service the way verify-lint-boundaries.mjs gives its own.

const RULE = 'window-text/no-literal-text';

const component = (body) => `export const Example = (): React.JSX.Element => ${body};`;

const cases = [
  // Text between tags, beside an icon, or in another language.
  refused('between-tags', component('<h1>Queue</h1>')),
  refused('beside-an-icon', component('<Button><Icon /> Queue</Button>')),
  refused('portuguese', component('<p>Fila</p>')),
  refused('japanese', component('<p>キュー</p>')),
  refused('in-a-sentence', component('<p>Restart the app, then {name} again.</p>')),

  // A string, a template or a choice between strings, as a child.
  refused('string-child', component("<h1>{'Queue'}</h1>")),
  refused('template-child', component('<p>{`Item ${index} of ${total}`}</p>')),
  refused('conditional-child', component("<span>{open ? 'Hide' : 'Show'}</span>")),
  refused('fallback-child', component("<span>{label ?? 'Information'}</span>")),
  refused('and-child', component("<span>{ready && 'Ready'}</span>")),

  // The attributes a person reads or hears, and the props that take a label.
  refused('aria-label', component('<button aria-label="Close sharing" />')),
  refused('aria-label-expression', component("<button aria-label={'Close sharing'} />")),
  refused('title', component('<button title="Existing files are not replaced" />')),
  refused('title-conditional', component("<button title={open ? 'Hide' : 'Show'} />")),
  refused('placeholder', component('<input placeholder="No username" />')),
  refused('alt', component('<img alt="The cover" src={cover} />')),
  refused('label-prop', component('<Field label="Device" />')),
  refused('description-prop', component('<Field description="What it is for." />')),

  // Read from a catalog, or made from one.
  accepted('catalog-child', component('<h1>{words.title}</h1>')),
  accepted('catalog-call', component('<p>{say(message)}</p>')),
  accepted('catalog-function', component('<p>{words.count(items)}</p>')),
  accepted('catalog-attribute', component('<button aria-label={words.close} />')),
  accepted('catalog-label', component('<Field label={words.device.label} />')),
  accepted('catalog-conditional', component('<span>{open ? words.hide : words.show}</span>')),
  accepted('element-on-the-right', component('<span>{ready && <Icon />}</span>')),

  // Names that are the same in every language, and what holds no word.
  accepted('name-of-the-app', component('<span>Mangabound</span>')),
  accepted('name-of-a-format', component('<option value="epub">EPUB</option>')),
  accepted('version', component('<span>v{version}</span>')),
  accepted('space', component("<span>{words.a}{' '}{words.b}</span>")),
  accepted('signs', component('<span>· {String(count)} × {String(size)}…</span>')),
  accepted('percentage', component('<span>{String(percentage)}%</span>')),

  // What is not read: attributes that are not text, and a comment.
  accepted(
    'attributes-that-are-not-text',
    component(
      '<label className="flex items-center" htmlFor="share-url" id="share-title" role="status" type="button" value="epub" />',
    ),
  ),
  accepted('comment', component('<span>{/* The queue */}</span>')),

  // The stories are examples of the window and may write what they show.
  accepted('a-story', component('<h1>Queue</h1>'), 'stories.tsx'),
];

function refused(name, code, extension = 'tsx') {
  return { filePath: `src/renderer/__check-${name}__.${extension}`, code, expectRuleFired: true };
}

function accepted(name, code, extension = 'tsx') {
  return { filePath: `src/renderer/__check-${name}__.${extension}`, code, expectRuleFired: false };
}

const virtualFiles = cases.map((testCase) => testCase.filePath);
if (virtualFiles.length !== new Set(virtualFiles).size) {
  throw new Error('Two no-literal-text cases share a virtual file path; give each one its own.');
}
const eslint = new ESLint({
  overrideConfig: [
    {
      files: virtualFiles,
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: virtualFiles,
            maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: virtualFiles.length,
          },
        },
      },
    },
  ],
});
const failures = [];

for (const testCase of cases) {
  const [result] = await eslint.lintText(testCase.code, { filePath: testCase.filePath });
  const fired = (result?.messages ?? []).some((message) => message.ruleId === RULE);
  if (fired !== testCase.expectRuleFired) {
    failures.push(
      `${testCase.filePath}: expected ${RULE} to ${testCase.expectRuleFired ? '' : 'not '}fire for \`${testCase.code}\`, but it ${fired ? 'did' : 'did not'}.`,
    );
  }
}

if (failures.length > 0) {
  throw new Error(
    `The ADR 0052 rule against literal text does not match ${String(failures.length)} expected outcome(s):\n` +
      failures.map((line) => `  - ${line}`).join('\n'),
  );
}

console.log(
  `All ${String(cases.length)} literal-text cases behaved as expected (` +
    `${String(cases.filter((c) => !c.expectRuleFired).length)} allowed, ` +
    `${String(cases.filter((c) => c.expectRuleFired).length)} rejected).`,
);
