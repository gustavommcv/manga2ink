import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { themeOf } from '@/renderer/stories/theme';

import { Button } from './button';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { NativeSelect } from './native-select';

/** What text and controls can be put on, in the order of how raised it is. */
const grounds = [
  { name: 'Page', className: 'bg-background' },
  { name: 'Surface', className: 'bg-surface' },
  { name: 'Muted', className: 'bg-muted' },
] as const;

/** The colors the interface sets text in, each said in its own color. */
const texts = [
  { name: 'Foreground', className: 'text-foreground' },
  { name: 'Muted foreground', className: 'text-muted-foreground' },
  { name: 'Subtle foreground', className: 'text-subtle-foreground' },
  { name: 'Accent', className: 'text-accent' },
  { name: 'Override', className: 'text-override' },
  { name: 'Warning', className: 'text-status-warning' },
  { name: 'Failed', className: 'text-status-failed' },
] as const;

const meta = {
  title: 'Design system/Theme',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every pair of text and ground the interface uses, in the theme the toolbar (or `globals=theme:…`)
 * picks, so a theme can be looked at, and read by the accessibility check, in one place (ADR 0067).
 * The page itself is in that theme: the play function says so.
 */
export const Palette: Story = {
  render: () => (
    <div className="bg-background text-foreground grid gap-4 p-6">
      {grounds.map((ground) => (
        <section
          aria-label={ground.name}
          className={`${ground.className} border-border space-y-1 rounded-lg border p-4`}
          key={ground.name}
        >
          {texts.map((text) => (
            <p className={`${text.className} text-sm`} key={text.name}>
              {text.name} on {ground.name.toLowerCase()}
            </p>
          ))}
          {/* The edge of a control is told from the ground it is on (ADR 0076). */}
          <div className="flex items-center gap-3 pt-2">
            <Checkbox aria-label={`A box on ${ground.name.toLowerCase()}`} />
            <div className="w-48">
              <Input aria-label={`A field on ${ground.name.toLowerCase()}`} />
            </div>
            <div className="w-48">
              <NativeSelect aria-label={`A select on ${ground.name.toLowerCase()}`}>
                <option>A choice</option>
              </NativeSelect>
            </div>
          </div>
        </section>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button>Continue</Button>
        <Button variant="outline">Choose a folder…</Button>
        <Button variant="destructive">Remove failed job</Button>
        <Button disabled>Unavailable</Button>
      </div>
    </div>
  ),
  play: async ({ globals }) => {
    await waitFor(async () => {
      await expect(document.documentElement.dataset.theme).toBe(themeOf(globals));
    });
  },
};
