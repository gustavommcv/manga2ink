import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withoutKnownFalsePositives } from '../support/accessibility-exceptions.mjs';

const rule = 'label-content-name-mismatch';
const searchButton = {
  target: ['button[data-open-modal=""]'],
  html: '<button data-open-modal="">',
};
const otherButton = { target: ['#download'], html: '<button id="download">' };

test('the search button of Starlight is not held against the page under that rule, and the rule goes with it when nothing else is under it', () => {
  assert.deepEqual(withoutKnownFalsePositives([{ id: rule, nodes: [searchButton] }]), []);
});

test('the selector of the button is the same with or without the value of its attribute', () => {
  const written = { target: ['button[data-open-modal]'], html: '<button data-open-modal>' };

  assert.deepEqual(withoutKnownFalsePositives([{ id: rule, nodes: [written] }]), []);
});

test('another element under that rule is still held against the page, alone', () => {
  const found = withoutKnownFalsePositives([{ id: rule, nodes: [searchButton, otherButton] }]);

  assert.deepEqual(found, [{ id: rule, nodes: [otherButton] }]);
});

test('the search button under any other rule is still held against the page', () => {
  const violations = [{ id: 'color-contrast', nodes: [searchButton] }];

  assert.deepEqual(withoutKnownFalsePositives(violations), violations);
});

test('a button with that selector inside another document is not the search button', () => {
  const inside = { target: ['iframe', 'button[data-open-modal=""]'], html: '<button>' };
  const violations = [{ id: rule, nodes: [inside] }];

  assert.deepEqual(withoutKnownFalsePositives(violations), violations);
});

test('a scan with nothing in it has nothing, and what it is given is not changed', () => {
  assert.deepEqual(withoutKnownFalsePositives([]), []);

  const violations = [{ id: rule, nodes: [searchButton, otherButton] }];
  withoutKnownFalsePositives(violations);
  assert.equal(violations[0].nodes.length, 2);
});
