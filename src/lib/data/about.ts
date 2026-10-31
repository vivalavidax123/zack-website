/** Everything the About page says. Edit here; the page lays it out. */
export type Milestone = { when: string; title: string; place: string; detail?: string };

export const about = {
	name: 'Zack',
	intro: 'TODO: a short intro.',
	timeline: [
		{ when: '2026 – now', title: 'Course to confirm', place: 'University of Melbourne' },
		{ when: '2023 – 2025', title: 'Course to confirm', place: 'University of Melbourne' }
	] satisfies Milestone[] as Milestone[],
	links: [
		{ label: 'GitHub', href: 'https://github.com/vivalavidax123' },
		{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/zeming-xia-9144a031b/' }
	]
};
