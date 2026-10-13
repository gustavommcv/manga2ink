import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { createNodeProcessRunner, type SpawnProcess } from '@/adapters/process/node-process-runner';
import {
  ProcessCancelledError,
  ProcessOutputLimitError,
  ProcessStartError,
} from '@/application/ports/process-runner';

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => true);
  return child;
}
type Child = ReturnType<typeof fakeChild>;

/** A runner that starts the one child it is given, and records how it was started. */
function runnerOf(child: Child, limit?: number) {
  const spawn = vi.fn(() => child) as unknown as ReturnType<typeof vi.fn> & SpawnProcess;
  const runner = createNodeProcessRunner({
    spawnProcess: spawn,
    ...(limit === undefined ? {} : { maxOutputBytes: limit }),
  });
  return { runner, spawn };
}
/** Lets what was written to a stream reach its listeners. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('how the tool is started', () => {
  it('without a shell, hidden on Windows, with the caller’s folder and the app’s environment', async () => {
    const child = fakeChild();
    const { runner, spawn } = runnerOf(child);
    const running = runner.run({ executablePath: 'tool', arguments: ['a b'], cwd: '/work' });
    child.emit('close', 0, null);
    await running;

    expect(spawn).toHaveBeenCalledExactlyOnceWith('tool', ['a b'], {
      cwd: '/work',
      env: process.env,
      shell: false,
      windowsHide: true,
    });
  });
});

describe('how much output is kept', () => {
  it('is far more than a megabyte before the default limit stops a run', async () => {
    const child = fakeChild();
    const running = runnerOf(child).runner.run({ executablePath: 'tool', arguments: [] });

    child.stdout.write(Buffer.alloc(1024 * 1024, 'a'));
    await flush();
    child.emit('close', 0, null);

    expect((await running).stdout).toHaveLength(1024 * 1024);
  });

  it('is exactly the limit and no more, counted over both streams', async () => {
    const atTheLimit = fakeChild();
    const first = runnerOf(atTheLimit, 8).runner.run({ executablePath: 'tool', arguments: [] });
    atTheLimit.stdout.write(Buffer.from('1234'));
    atTheLimit.stderr.write(Buffer.from('5678'));
    await flush();
    atTheLimit.emit('close', 0, null);
    expect(await first).toMatchObject({ stdout: '1234', stderr: '5678' });

    const over = fakeChild();
    const second = runnerOf(over, 8).runner.run({ executablePath: 'tool', arguments: [] });
    const refused = expect(second).rejects.toBeInstanceOf(ProcessOutputLimitError);
    over.stdout.write(Buffer.from('1234'));
    over.stderr.write(Buffer.from('56789'));
    await flush();

    await refused;
    expect(over.kill).toHaveBeenCalledOnce();
  });

  it('keeps the halves of a character that arrive on one stream apart from the other stream’s', async () => {
    const child = fakeChild();
    const running = runnerOf(child).runner.run({ executablePath: 'tool', arguments: [] });
    const e = Buffer.from('é', 'utf8');

    child.stdout.write(e.subarray(0, 1));
    await flush();
    child.stderr.write(Buffer.from('warning'));
    await flush();
    child.stdout.write(e.subarray(1));
    await flush();
    child.emit('close', 0, null);

    expect(await running).toMatchObject({ stdout: 'é', stderr: 'warning' });
  });
});

describe('a run that has already ended', () => {
  it('is not ended again by what the tool does afterwards', async () => {
    const child = fakeChild();
    const onChunk = vi.fn();
    const controller = new AbortController();
    const running = runnerOf(child).runner.run(
      { executablePath: 'tool', arguments: [] },
      { signal: controller.signal, onChunk },
    );
    const cancelled = expect(running).rejects.toBeInstanceOf(ProcessCancelledError);
    // Half of a character is held by the decoder when the run is cancelled.
    child.stdout.write(Buffer.from([0xc3]));
    await flush();
    const heard = onChunk.mock.calls.length;

    controller.abort();
    await cancelled;
    // The process does not stop at once: what it still says, how it ends, and that it fails, are
    // not the run's any more.
    child.stdout.write(Buffer.from('late'));
    await flush();
    child.emit('error', new Error('spawn failed late'));
    child.emit('close', 0, null);
    controller.abort();

    expect(onChunk).toHaveBeenCalledTimes(heard);
    expect(child.kill).toHaveBeenCalledOnce();
  });

  it('stops listening to the signal once it is over, however it ended', async () => {
    const closed = fakeChild();
    const first = new AbortController();
    const removeAfterClose = vi.spyOn(first.signal, 'removeEventListener');
    const running = runnerOf(closed).runner.run(
      { executablePath: 'tool', arguments: [] },
      { signal: first.signal },
    );
    closed.emit('close', 0, null);
    await running;
    expect(removeAfterClose).toHaveBeenCalledWith('abort', expect.any(Function));

    const failed = fakeChild();
    const second = new AbortController();
    const removeAfterFail = vi.spyOn(second.signal, 'removeEventListener');
    const refused = runnerOf(failed, 1).runner.run(
      { executablePath: 'tool', arguments: [] },
      { signal: second.signal },
    );
    const settled = expect(refused).rejects.toBeInstanceOf(ProcessOutputLimitError);
    failed.stdout.write(Buffer.from('12'));
    await flush();
    await settled;
    expect(removeAfterFail).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('listens to the signal once, so a second abort cannot end a run twice', async () => {
    const child = fakeChild();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const running = runnerOf(child).runner.run(
      { executablePath: 'tool', arguments: [] },
      { signal: controller.signal },
    );
    const cancelled = expect(running).rejects.toBeInstanceOf(ProcessCancelledError);

    controller.abort();
    await cancelled;

    expect(add).toHaveBeenCalledExactlyOnceWith('abort', expect.any(Function), { once: true });
  });
});

describe('what a failing start says when the run was being cancelled', () => {
  it('is cancellation, not a tool that could not be started', async () => {
    const child = fakeChild();
    const controller = new AbortController();
    // Registered first, so it runs before the runner's own: the child fails as the abort arrives.
    controller.signal.addEventListener('abort', () => {
      child.emit('error', new Error('spawn tool ENOENT'));
    });
    const running = runnerOf(child).runner.run(
      { executablePath: 'tool', arguments: [] },
      { signal: controller.signal },
    );
    const cancelled = expect(running).rejects.toBeInstanceOf(ProcessCancelledError);

    controller.abort();

    await cancelled;
  });

  it('is a tool that could not be started, when nothing was cancelled', async () => {
    const child = fakeChild();
    const running = runnerOf(child).runner.run(
      { executablePath: 'tool', arguments: [] },
      { signal: new AbortController().signal },
    );
    const refused = expect(running).rejects.toBeInstanceOf(ProcessStartError);

    child.emit('error', new Error('spawn tool ENOENT'));

    await refused;
  });
});

describe('what a consumer of the output can do to a run', () => {
  it('fails the run with what it threw, and keeps something that is not an error as the cause', async () => {
    const child = fakeChild();
    const running = runnerOf(child).runner.run(
      { executablePath: 'tool', arguments: [] },
      {
        onChunk: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'not an error';
        },
      },
    );
    const refused = expect(running).rejects.toMatchObject({
      message: 'The process runner failed.',
      cause: 'not an error',
    });

    child.stdout.write(Buffer.from('x'));
    await flush();

    await refused;
  });

  it('is not asked about an empty end of a stream, and needs no consumer for a last half character', async () => {
    const plain = fakeChild();
    const onChunk = vi.fn<(chunk: { stream: string; text: string }) => void>();
    const first = runnerOf(plain).runner.run(
      { executablePath: 'tool', arguments: [] },
      { onChunk },
    );
    plain.stdout.write(Buffer.from('whole'));
    await flush();
    plain.emit('close', 0, null);
    await first;
    // Only what was written: the end of the streams said nothing more.
    expect(onChunk.mock.calls.map(([chunk]) => chunk)).toEqual([
      { stream: 'stdout', text: 'whole' },
    ]);

    const cut = fakeChild();
    const second = runnerOf(cut).runner.run({ executablePath: 'tool', arguments: [] });
    cut.stdout.write(Buffer.from([0xc3]));
    cut.stderr.write(Buffer.from([0xc3]));
    await flush();
    cut.emit('close', 0, null);

    await expect(second).resolves.toMatchObject({ exitCode: 0 });
  });
});
