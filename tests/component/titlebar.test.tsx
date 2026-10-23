import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Titlebar } from '@/renderer/components/shell/titlebar';

describe('Titlebar', () => {
  it('names the app without the old desktop or foundation labels', () => {
    render(<Titlebar />);

    expect(screen.getByText('Manga2Ink')).toBeVisible();
    expect(screen.queryByText('Desktop')).not.toBeInTheDocument();
    expect(screen.queryByText('Foundation')).not.toBeInTheDocument();
  });

  it('draws the logo before the name, as a picture that is not one to drag', () => {
    const { container } = render(<Titlebar />);

    const logo = container.querySelector('img');
    expect(logo).toHaveAttribute('alt', '');
    expect(logo).toHaveAttribute('draggable', 'false');
    expect(logo).toHaveAttribute('width', '20');
    expect(logo).toHaveAttribute('height', '20');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      logo!.compareDocumentPosition(screen.getByText('Manga2Ink')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the running app version when it is known', () => {
    render(<Titlebar version="0.1.0-alpha.1" />);

    expect(screen.getByText('v0.1.0-alpha.1')).toBeVisible();
  });

  it('shows no version label when it is not known', () => {
    render(<Titlebar />);

    expect(screen.queryByText(/^v\d/u)).not.toBeInTheDocument();
  });

  it('holds actions on its right, apart from the part the window is dragged by', () => {
    render(
      <Titlebar>
        <button type="button">An action</button>
      </Titlebar>,
    );

    const action = screen.getByRole('button', { name: 'An action' });
    expect(action.parentElement).toHaveClass('window-titlebar-actions');
  });

  it('lays its actions out in a row, so there can be more than one', () => {
    render(
      <Titlebar>
        <button type="button">One</button>
        <button type="button">Another</button>
      </Titlebar>,
    );

    expect(screen.getByRole('button', { name: 'One' }).parentElement).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
    );
  });

  it('has no actions block when it has no actions', () => {
    const { container } = render(<Titlebar />);

    expect(container.querySelector('.window-titlebar-actions')).toBeNull();
  });

  it.each([
    ['darwin', 'pl-20'],
    ['win32', 'pl-4'],
    ['linux', 'pl-4'],
  ])('leaves room on %s for the window buttons where they are (%s)', (platform, inset) => {
    const { container } = render(<Titlebar platform={platform} />);

    expect(container.querySelector('.window-titlebar-content')).toHaveClass(inset);
  });

  it('starts at the normal inset when the platform is not known', () => {
    const { container } = render(<Titlebar />);

    expect(container.querySelector('.window-titlebar-content')).toHaveClass('pl-4');
  });
});
