// The person behind this site. One entry: the theme's stock team is gone.
const data = [
    {
        id: 1,
        name: "Kundai Farai Sachikonye",
        position: 'Wissenschaftlicher Mitarbeiter · Institut für Biochemie, Universität Greifswald',
        src: '/img/team/kundai.jpg',
        social: [
            {title: "GH", url: "https://github.com/fullscreen-triangle"},
            {title: "ORCID", url: "https://orcid.org/0009-0009-5698-9595"},
        ]
    },
]

export const getTeamData = () => data;

export const getTeamItem = (value, whereName = "id") => {
    return data.find(item => item[whereName] === value);
};
