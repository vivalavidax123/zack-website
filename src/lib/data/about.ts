/** Everything the About page says. Edit here; the page lays it out. */
export type Milestone = { when: string; title: string; place: string; detail?: string };

export const about = {
	name: 'Zeming Xia',
	intro:
		'Software engineering graduate, now studying a Master of IT at the University of Melbourne.',
	/** Newest first. */
	timeline: [
		{ when: 'Mar 2026 – Jun 2027', title: 'Master of IT', place: 'University of Melbourne' },
		{
			when: 'Jul 2022 – Nov 2025',
			title: 'Bachelor of Science',
			place: 'University of Melbourne',
			detail: 'Computer Software Engineering'
		}
	] as Milestone[],
	links: [
		{ label: 'GitHub', href: 'https://github.com/vivalavidax123' },
		{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/zeming-xia-9144a031b/' }
	]
};
