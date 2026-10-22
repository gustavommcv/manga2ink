import type { BrowserWindow } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { dialogMessages } from '@/i18n/dialog-messages';
import { askToLeave, LeavingGuard } from '@/main/leaving';

const electron = vi.hoisted(() => ({
  showMessageBox: vi.fn<(...args: unknown[]) => Promise<{ response: number }>>(),
}));
vi.mock('electron', () => ({ dialog: { showMessageBox: electron.showMessageBox } }));

/** Lets what was started by asking run its continuations. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

afterEach(() => {
  electron.showMessageBox.mockReset();
});

describe('leaving the app while a conversion runs', () => {
  it('is allowed, and nobody is asked, when no conversion is running', () => {
    const ask = vi.fn(() => Promise.resolve(false));
    const guard = new LeavingGuard(() => false, ask);
    const leave = vi.fn();

    expect(guard.allows(leave)).toBe(true);

    expect(ask).not.toHaveBeenCalled();
    expect(leave).not.toHaveBeenCalled();
  });

  it('is held back, and the person asked, while one is running', () => {
    const ask = vi.fn(() => new Promise<boolean>(() => undefined));
    const guard = new LeavingGuard(() => true, ask);

    expect(guard.allows(vi.fn())).toBe(false);

    expect(ask).toHaveBeenCalledOnce();
  });

  it('goes on with what was held back, and is allowed for the rest of the leaving, when they agree', async () => {
    const guard = new LeavingGuard(
      () => true,
      () => Promise.resolve(true),
    );
    const leave = vi.fn();

    expect(guard.allows(leave)).toBe(false);
    await settle();

    expect(leave).toHaveBeenCalledOnce();
    // The window closing and then the app quitting are one leaving: the second asks nothing.
    expect(guard.allows(vi.fn())).toBe(true);
  });

  it('goes on with nothing when they would rather keep converting, and asks again the next time', async () => {
    const ask = vi.fn(() => Promise.resolve(false));
    const guard = new LeavingGuard(() => true, ask);
    const leave = vi.fn();

    expect(guard.allows(leave)).toBe(false);
    await settle();
    expect(guard.allows(leave)).toBe(false);
    await settle();

    expect(leave).not.toHaveBeenCalled();
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('does not stack questions: closing twice while one is open asks once', async () => {
    let answer: (agrees: boolean) => void = () => undefined;
    const ask = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    const guard = new LeavingGuard(() => true, ask);
    const leave = vi.fn();

    guard.allows(leave);
    guard.allows(leave);
    guard.allows(leave);
    answer(true);
    await settle();

    expect(ask).toHaveBeenCalledOnce();
    expect(leave).toHaveBeenCalledOnce();
  });

  it('is allowed once the conversion has ended, even after they chose to keep it', async () => {
    let converting = true;
    const guard = new LeavingGuard(
      () => converting,
      () => Promise.resolve(false),
    );

    expect(guard.allows(vi.fn())).toBe(false);
    await settle();
    converting = false;

    expect(guard.allows(vi.fn())).toBe(true);
  });
});

describe('the question', () => {
  const words = dialogMessages.en.leaveWhileConverting;

  it('is a warning over the window, with the safe answer as the default and as the one Escape gives', async () => {
    const window = {} as BrowserWindow;
    electron.showMessageBox.mockResolvedValue({ response: 0 });

    await askToLeave(words, window);

    expect(electron.showMessageBox).toHaveBeenCalledExactlyOnceWith(window, {
      type: 'warning',
      message: 'A conversion is still running.',
      detail: 'If you close Manga2Ink now, it will be lost.',
      buttons: ['Keep converting', 'Close anyway'],
      defaultId: 0,
      cancelId: 0,
    });
  });

  it('is asked on its own when there is no window to put it over', async () => {
    electron.showMessageBox.mockResolvedValue({ response: 0 });

    await askToLeave(words, undefined);

    expect(electron.showMessageBox).toHaveBeenCalledOnce();
    expect(electron.showMessageBox.mock.calls[0]).toHaveLength(1);
  });

  it.each([
    [0, false],
    [1, true],
  ])('takes the button %s to mean leaving is %s', async (response, leaves) => {
    electron.showMessageBox.mockResolvedValue({ response });

    expect(await askToLeave(words, undefined)).toBe(leaves);
  });

  it('is said in Portuguese for a window in Portuguese', () => {
    expect(dialogMessages['pt-BR'].leaveWhileConverting).toEqual({
      message: 'Há uma conversão em andamento.',
      detail: 'Se você fechar o Manga2Ink agora, ela será perdida.',
      keep: 'Continuar convertendo',
      leave: 'Fechar mesmo',
    });
  });
});
