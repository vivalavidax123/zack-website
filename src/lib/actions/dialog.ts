const FOCUSABLE =
	'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Svelte action for a panel that behaves like a dialog: focus moves into it
 * when it opens, and Tab cycles inside it instead of wandering to the page
 * behind. Closing (and returning focus) stays with the page that opened it.
 */
export function dialog(node: HTMLElement) {
	node.focus({ preventScroll: true });

	function onkeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;
		const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
		if (!items.length) return;
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;
		if (e.shiftKey && (active === first || active === node)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', onkeydown);
	return { destroy: () => node.removeEventListener('keydown', onkeydown) };
}
