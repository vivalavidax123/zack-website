/** One project on the Projects page. Add another entry here and it appears as a new drop. */
export type Project = {
	id: string;
	name: string;
	/** One line, shown when you hover the drop. */
	summary: string;
	/** Shown in the panel. */
	description: string;
	highlights: string[];
	stack: string[];
	when: string;
	image?: { src: string; alt: string };
	links: { label: string; href: string }[];
};

export const projects: Project[] = [
	{
		id: 'your-renting-helper',
		name: 'Your Renting Helper',
		summary: 'How convenient is a rental for everyday life?',
		description:
			'A web prototype that scores how convenient an Australian rental location is for everyday life. Search an address or suburb to see nearby amenities, transport, practical services and a compact location score.',
		highlights: [
			'Category scores with explanations, nearby places and an amenity map',
			'No-car and car-owner views, with Balanced, Student, Family and Commuter presets',
			'Travel to the Melbourne CBD, how hilly the area is, and community rent medians',
			'A grounded AI analyst and side-by-side comparison for signed-in users'
		],
		stack: [
			'Next.js',
			'React',
			'TypeScript',
			'Tailwind CSS',
			'PostgreSQL',
			'Prisma',
			'Better Auth',
			'Google Maps',
			'OpenAI API',
			'Vitest',
			'Vercel'
		],
		when: 'May – Oct 2026',
		image: {
			src: '/projects/your-renting-helper.webp',
			alt: 'Location result for Brunswick VIC with category scores and the amenity map'
		},
		links: [
			{ label: 'Live demo', href: 'https://rent-score-prototype.vercel.app/' },
			{ label: 'Code', href: 'https://github.com/vivalavidax123/Your_Renting_Helper' }
		]
	}
];
