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
		gallery: [
			{
				src: '/projects/shots/this-website/1.webp',
				alt: 'Home page with the name Zeming Xia and four drops labelled Songs, Projects, About and Now playing on rainy glass',
				caption: 'The home page: four drops on a rainy window.'
			},
			{
				src: '/projects/shots/this-website/2.webp',
				alt: 'Songs page with raindrops on glass, one drop showing an album cover with the song title and the word Playing beside it',
				caption: 'Hovering a song stops its drop, shows the cover and plays a preview.'
			},
			{
				src: '/projects/shots/this-website/3.webp',
				alt: 'Projects page with two project drops and an open panel describing this website',
				caption: 'Projects open as a panel that splashes out of their drop.'
			},
			{
				src: '/projects/shots/this-website/4.webp',
				alt: 'About page card with a short intro, a study timeline and GitHub and LinkedIn buttons over rainy glass',
				caption: 'About: study timeline and links.'
			}
		],
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
		],
		meta: ['Solo developer', 'Working prototype', 'Web app'],
		gallery: [
			{
				src: '/projects/shots/your-renting-helper/2.webp',
				alt: 'Result for Brunswick VIC showing an overall score of 93, eight category score cards and a map of nearby places',
				caption: 'A result: overall score, eight category scores and the amenity map.'
			},
			{
				src: '/projects/shots/your-renting-helper/1.webp',
				alt: 'Your Renting Helper landing page with an address search box, example suburbs and a sample score card',
				caption: 'Start with an address or one of the example suburbs.'
			},
			{
				src: '/projects/shots/your-renting-helper/3.webp',
				alt: 'Evidence page for Brunswick with public transport and driving times to Melbourne CBD, walking times, community rent and terrain',
				caption: 'Commute to the CBD, walking times, community rent and terrain.'
			},
			{
				src: '/projects/shots/your-renting-helper/4.webp',
				alt: 'Transport category page for Brunswick with a score of 89, an explanation, a list of nearby stops and stations, and a map',
				caption: 'Each category explains its score with the nearby places behind it.'
			},
			{
				src: '/projects/shots/your-renting-helper/5.webp',
				alt: 'The Brunswick result page in the light colour theme',
				caption: 'The same result in the light theme.'
			}
		],
		story: [
			{
				heading: 'What it is',
				paragraphs: [
					'I built Your Renting Helper to answer a question I kept asking while looking at rentals: what is it actually like to live here day to day? You search an address or suburb and get an overall score out of 100, eight category scores (groceries, transport, health, food and so on), a map of the places behind each score, and an evidence page with the commute to Melbourne CBD, walking times, how hilly the area is and community-reported rent.',
					'It works without an account. Signing in adds saved and recent searches, a side-by-side comparison of two locations, rent contributions and an AI analyst that explains what a result means for renting there. It is a convenience indicator, not an official rating or valuation.'
				]
			},
			{
				heading: 'How it works',
				paragraphs: [
					'Each search fetches nearby places from Google Places, with Transitland for bus stops and upcoming services when available. Every category is scored out of 100 from three parts: proximity (50 points, full marks within 400 m, then an exponential decay that is gentler for car owners), variety (30 points, rising with the number of options) and quality (20 points, top ratings compared with a typical rating for that category). The overall score is a weighted average, and the presets (Balanced, Student, Family, Commuter) only change the weights. Raw results are stored, so switching profile or preset recalculates instantly without new API calls.',
					"The commute card uses Geoapify for driving time and Google's weekday 8 am timetable for public transport, and terrain comes from Google elevation data. The AI analyst only sees the score breakdown and nearby places the app has already computed. Every question passes a moderation check and a scope check first, so it stays on rental questions and does not make up facts."
				]
			},
			{
				heading: 'Challenges and what I learned',
				paragraphs: [
					'The hardest part was making the score fair and explainable rather than just a number. Small rules mattered: deduplicating places across categories, ignoring places with very few reviews, handling transport separately, and making sure the car-owner view can never lower a score. Writing those rules as tests (96 tests in CI) is what let me change the formula with confidence.',
					'I also learned how much cost and reliability depend on external APIs: one uncached search makes about ten provider calls, so caching results in PostgreSQL was essential. Building the AI analyst taught me to treat the model as an explainer of my own data, with moderation and scope checks in front of it, rather than as a source of facts.'
				]
			}
		]
	}
];
