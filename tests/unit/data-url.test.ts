import { describe, expect, it } from 'vitest';

import { dataUrlOf } from '@/renderer/lib/data-url';

describe('an image from the bytes of a page', () => {
  it('is something the window can show with no file for it to be loaded from', () => {
    expect(dataUrlOf('image/png', new Uint8Array([137, 80, 78, 71]))).toBe(
      'data:image/png;base64,iVBORw==',
    );
    expect(dataUrlOf('image/gif', new Uint8Array())).toBe('data:image/gif;base64,');
  });

  it('is made in pieces for a page of some hundreds of kilobytes, and comes out whole', () => {
    const big = new Uint8Array(100_000).fill(65);

    expect(dataUrlOf('image/jpeg', big)).toBe(
      `data:image/jpeg;base64,${btoa('A'.repeat(100_000))}`,
    );
  });
});
