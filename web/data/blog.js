const data = [
    {
        id: 1,
        title: "Extreme Athleticism Is the New Midlife Crisis",
        slug: 'single-blog',
        author: "Dsn Grid",
        date: "March , 17th 2020",
        category: ['Lifestyle'],
        description: `Whoever said “It’s not about the destination. It’s the journey” never flew on a long ...`,
        src: '/img/blog/1.jpg',
        overlay: 4
    }, {
        id: 2,
        title: "The Day I Lost My Child in Charles de Gaulle Airport",
        slug: 'single-blog',
        author: "Dsn Grid",
        date: "March , 17th 2020",
        category: ['Travel'],
        description: `Whoever said “It’s not about the destination. It’s the journey” never flew on a long ...`,
        src: '/img/blog/2.jpg',
        overlay: 4
    }, {
        id: 3,
        title: "Relationships Aren’t Easy, But They’re Worth It",
        slug: 'single-blog',
        author: "Dsn Grid",
        date: "March , 17th 2020",
        category: ['Health'],
        description: `Whoever said “It’s not about the destination. It’s the journey” never flew on a long ...`,
        src: '/img/blog/3.jpg',
        overlay: 4
    }, {
        id: 4,
        title: "Extreme Athleticism Is the New Midlife Crisis",
        slug: 'single-blog',
        author: "Dsn Grid",
        date: "March , 17th 2020",
        category: ['Lifestyle'],
        description: `Whoever said “It’s not about the destination. It’s the journey” never flew on a long ...`,
        src: '/img/blog/4.jpg',
        overlay: 4
    }, {
        id: 5,
        title: "The Day I Lost My Child in Charles de Gaulle Airport",
        slug: 'single-blog',
        author: "Dsn Grid",
        date: "March , 17th 2020",
        category: ['Travel'],
        description: `Whoever said “It’s not about the destination. It’s the journey” never flew on a long ...`,
        src: '/img/blog/5.jpg',
        overlay: 4
    }, {
        id: 6,
        title: "Relationships Aren’t Easy, But They’re Worth It",
        slug: 'single-blog',
        author: "Dsn Grid",
        date: "March , 17th 2020",
        category: ['Health'],
        description: `Whoever said “It’s not about the destination. It’s the journey” never flew on a long ...`,
        src: '/img/blog/6.jpg',
        overlay: 4
    }

]

export const getBlogData = () => data;

export const getBlogItem = (value, whereName = "slug") => {
    return data.find(item => item[whereName] === value);
};
export const getBlogLink = (item) => {
    if (item)
        return item.slug && '/' + item.slug;

    return '';
};