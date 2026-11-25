// Kundai's projects (from his CV and repositories). Each links to its repository or its live
// demo (`href`); the images are the theme's placeholders until project images exist.

const data = [
    {
        id: 1,
        title: "hegel",
        slug: 'hegel',
        href: 'https://github.com/fullscreen-triangle/hegel',
        category: ['Systems biology', 'Causal graphs'],
        description: 'Causal graphs derived from the kinetics of metabolic networks, read as resistive circuits.',
        src: '/img/project/project1/1.jpg',
        overlay: 6
    },
    {
        id: 2,
        title: "gospel",
        slug: 'gospel',
        href: 'https://github.com/fullscreen-triangle/gospel',
        src: '/img/project/project2/1.jpg',
        category: ['Multi-omics'],
        description: 'Genotype, transcriptomics and metagenomics integrated; validated against 1000 Genomes, gnomAD, UK Biobank.',
        overlay: 6,
    },
    {
        id: 3,
        title: "syndrome",
        slug: 'syndrome',
        href: 'https://syndrome-seven.vercel.app/tools',
        src: '/img/project/project3/1.jpg',
        category: ['Computational oncology'],
        description: 'Neoantigen and MHC binding prediction, checked against IEDB.',
        overlay: 6,
    },
    {
        id: 4,
        title: "Crown Prince",
        slug: 'crown-prince',
        href: 'https://crown-prince-four-courners.vercel.app/',
        src: '/img/project/project4/1.jpg',
        category: ['Pharmacology'],
        description: 'Pharmacokinetics, pharmacodynamics and ADME from first principles, validated against NIST data.',
        overlay: 6,
    },
    {
        id: 5,
        title: "Systems-biology shaders",
        slug: 'systems-biology-shaders',
        href: 'https://systems-biology-shaders.vercel.app/',
        src: '/img/project/project5/1.jpg',
        category: ['Cell modelling', 'GPU'],
        description: 'Cell and systems-biology models computed on the GPU.',
        overlay: 6,
    },
    {
        id: 6,
        title: "Agent Smith desk",
        slug: 'agent-smith',
        href: 'https://github.com/fullscreen-triangle/kwisatz-haderach',
        src: '/img/project/project6/1.jpg',
        category: ['Personal research desk'],
        description: 'Mail, documents, plans, work and tools in one desk on a home server; this site.',
        overlay: 4
    }
]

export const getPortfolioData = () => data;

export const getPortfolioItem = (value, whereName = "slug") => {
    return data.find(item => item[whereName] === value);
};
export const getPortfolioLink = (item) => {
    if (item)
        return item.href || (item.slug && '/portfolio/' + item.slug);

    return '';
};
