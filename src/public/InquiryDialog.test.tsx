import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { InquiryDialog } from './InquiryDialog';

function Harness() {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  return <><button onClick={(event) => { setTrigger(event.currentTarget); setOpen(true); }}>Open</button><InquiryDialog locale="en" email="hello@example.com" open={open} onClose={() => setOpen(false)} returnFocus={trigger} /></>;
}

describe('InquiryDialog accessibility', () => {
  it('moves focus in, traps it, closes with Escape and restores focus', async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' }); await user.click(trigger);
    const close = screen.getAllByRole('button', { name: 'Close partnership inquiry' })[1]!;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /Send inquiry/ })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });
});
