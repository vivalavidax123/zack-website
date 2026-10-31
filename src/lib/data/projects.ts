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
		id: 'zemingxia-com',
		name: 'This website',
		summary: 'Rain on a window, with the songs I keep coming back to.',
		description:
			'My personal site, built as a rainy window. Every page is drops on the glass, and the Songs page turns my Spotify listening into drops you can hover to hear a preview.',
		highlights: [
			'A WebGL2 rain-on-glass engine written from scratch, with drops that refract the scene behind them',
			'Songs load live from Spotify, with 30-second previews matched on Deezer by ISRC',
			'A small server layer that keeps the Spotify keys private and caches answers at the edge',
			'Page transitions that zoom through the glass toward what you clicked'
		],
		stack: ['SvelteKit', 'Svelte 5', 'TypeScript', 'WebGL2', 'Spotify API', 'Deezer API', 'Vercel'],
		when: 'Oct 2026',
		links: [
			{ label: 'Live', href: 'https://zemingxia.com' },
			{ label: 'Code', href: 'https://github.com/vivalavidax123/zack-website' }
		]
	},
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
