// Kundai's papers (applications/publications/publication-list.md). `href` is set only where
// the paper has a link the desk knows (a DOI); the others show without one rather than
// pointing at a page that is not theirs. The images are the theme's placeholders.

const data = [
    {
        id: 1,
        title: "Therapeutic effect as loop-closure restoration: a first-principles framework using GPU ray tracing for real-time prediction of drug outcomes",
        slug: 'loop-closure-restoration',
        href: 'https://doi.org/10.35242/ijamhs.00046',
        author: "Kundai Farai Sachikonye",
        date: "2026",
        category: ['Pharmacology'],
        description: `International Journal of Annals of Medical and Health Science`,
        src: '/img/blog/1.jpg',
        overlay: 4
    }, {
        id: 2,
        title: "Rambling and trembling as distinct components of the closed postural control circuit",
        slug: 'rambling-and-trembling',
        author: "Kundai Farai Sachikonye",
        date: "2026",
        category: ['Biomechanics'],
        description: `PriMera Scientific Engineering 9.1 — validated with multi-sensor wearables`,
        src: '/img/blog/2.jpg',
        overlay: 4
    }, {
        id: 3,
        title: "On the thermodynamic consequences of categorical completion mechanics in membrane dynamics",
        slug: 'membrane-dynamics',
        author: "Kundai Farai Sachikonye",
        date: "2025",
        category: ['Membranes'],
        description: `Journal of Architectural Engineering and Built Environments`,
        src: '/img/blog/3.jpg',
        overlay: 4
    }, {
        id: 4,
        title: "On the thermodynamic consequences of oscillatory mechanics on geolocation",
        slug: 'oscillatory-geolocation',
        author: "Kundai Farai Sachikonye",
        date: "",
        category: ['Positioning'],
        description: `Journal of Artificial Intelligence, Virtual Reality, and Human-Centered Computing`,
        src: '/img/blog/4.jpg',
        overlay: 4
    }, {
        id: 5,
        title: "Dynamic Flux Theory: a reformulation of fluid dynamics through emergent pattern alignment and oscillatory entropy coordinates",
        slug: 'dynamic-flux-theory',
        author: "Kundai Farai Sachikonye",
        date: "",
        category: ['Fluid dynamics'],
        description: `Journal of Advanced Robotics, Autonomous Systems and Human-Machine Interaction`,
        src: '/img/blog/5.jpg',
        overlay: 4
    }, {
        id: 6,
        title: "The origins of economic processes: a mathematical framework for information-seeking behaviour as the foundation of all commerce",
        slug: 'origins-of-economic-processes',
        author: "Kundai Farai Sachikonye",
        date: "2025",
        category: ['Economics'],
        description: `Journal of Economic Development and Global Markets`,
        src: '/img/blog/6.jpg',
        overlay: 4
    },
]

export const getBlogData = () => data;

export const getBlogItem = (value, whereName = "slug") => {
    return data.find(item => item[whereName] === value);
};
export const getBlogLink = (item) => {
    if (item)
        return item.href || '';

    return '';
};
