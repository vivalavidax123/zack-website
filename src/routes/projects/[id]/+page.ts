import { error } from '@sveltejs/kit';
import { projects } from '#lib/data/projects.js';
import type { EntryGenerator, PageLoad } from './$types';

// Project pages never change between deploys, so build them once as plain HTML.
export const prerender = true;

export const entries: EntryGenerator = () => projects.map((p) => ({ id: p.id }));

export const load: PageLoad = ({ params }) => {
	const index = projects.findIndex((p) => p.id === params.id);
	if (index < 0) error(404, 'No such project');
	return {
		project: projects[index],
		// Lead on to the next project, wrapping round, so a reader never hits a dead end.
		next: projects.length > 1 ? projects[(index + 1) % projects.length] : null
	};
};
