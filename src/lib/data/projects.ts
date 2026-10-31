/** A screenshot on a project's own page. */
export type Shot = { src: string; alt: string; caption: string };

/**
 * One project on the Projects page. Add another entry here and it appears as a
 * new drop, with its own page at /projects/<id>.
 */
export type Project = {
	/** Also the address of its page, so keep it short and lowercase. */
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
	/** The small line under the title on its page: role, status, kind of project. */
	meta?: string[];
	/** Screenshots on its page, in order. */
	gallery?: Shot[];
	/** The write-up on its page: a few short sections, each one or two paragraphs. */
	story?: { heading: string; paragraphs: string[] }[];
};

export const projects: Project[] = [
	{
		id: 'this-website',
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
		image: {
			src: '/projects/this-website.webp',
			alt: 'The Songs page: songs as raindrops on a rainy window, one showing its album cover'
		},
		links: [
			{ label: 'Live', href: 'https://zemingxia.com' },
			{ label: 'Code', href: 'https://github.com/vivalavidax123/zack-website' }
		],
		meta: ['Solo developer', 'Live', 'Personal website'],
		story: [
			{
				heading: 'What it is',
				paragraphs: [
					'My personal site, designed as a window on a rainy night. Instead of a menu, every page is a few large drops on the glass: the home page links to Songs, Projects and About, and the Songs page turns the music I have been listening to into drops you can hover to hear.',
					'I wanted something that felt like mine rather than a template, and that showed the kind of front-end and graphics work I enjoy.'
				]
			},
			{
				heading: 'How it works',
				paragraphs: [
					'The rain is a small WebGL2 engine I wrote from scratch. It draws every drop into an offscreen texture, then a second pass bends the blurred scene behind the glass through those drops, so each one acts like a tiny lens. Drops land, merge, slide down and leave trails, and the big "feature" drops that carry links drift slowly and pause near the pointer.',
					'Songs come live from my Spotify account through a small server layer on Vercel, which keeps the keys private. Spotify no longer offers previews, so each track is matched on Deezer, first by its ISRC code and then by title and artist, and the 30-second preview fades in when you hover its drop. Answers are cached at the edge for ten minutes, so the page stays fast without asking Spotify on every visit.'
				]
			},
			{
				heading: 'Challenges and what I learned',
				paragraphs: [
					'Keeping the rain smooth was the main challenge: it has to hold 60 frames per second while the page stays responsive, which meant instanced drawing, a fixed time step and pausing whenever the tab is hidden or the visitor prefers reduced motion. Audio was the other: browsers block sound until a click, and iOS ignores volume changes, so the fades and the rain sound run through Web Audio.',
					'Every page scores 97 to 100 in Lighthouse, and the Songs page went from about 1.4 MB to under 70 KB on phones by loading previews only when the pointer comes near a drop.'
				]
			}
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
