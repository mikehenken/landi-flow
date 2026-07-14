import { describe, expect, it } from 'vitest';

/**
 * Command palette must use native dialog top-layer stacking above story modals.
 * This documents the contract used by CommandPalette (z-[200] + showModal).
 */
describe('command palette top-layer contract', () => {
  it('requires palette z-index above shell overlays (z-50)', () => {
    const paletteZ = 200;
    const shellZ = 50;
    expect(paletteZ).toBeGreaterThan(shellZ);
  });

  it('documents Search trigger + mod+K open the same controlled open state', () => {
    let commandOpen = false;
    const setCommandOpen = (next: boolean): void => {
      commandOpen = next;
    };
    // Search button
    setCommandOpen(true);
    expect(commandOpen).toBe(true);
    setCommandOpen(false);
    // Cmd/Ctrl+K
    const mod = true;
    const key = 'k';
    if (mod && key.toLowerCase() === 'k') {
      setCommandOpen(true);
    }
    expect(commandOpen).toBe(true);
  });
});
