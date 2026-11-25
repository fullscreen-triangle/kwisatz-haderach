import {dsnCN} from "../../hooks/helper";


const socialContent = [
    {name: "GitHub.", href: "https://github.com/fullscreen-triangle"},
    {name: "ORCID.", href: "https://orcid.org/0009-0009-5698-9595"},
    {name: "GitLab.", href: "https://gitlab.com/k.sachikonye"},
];


function Social({className, ...restProps}) {
    return (
        <div className={dsnCN("footer-social p-relative", className)} {...restProps}>
            <ul>
                {socialContent && socialContent.map(($item, $number) =>
                    <li className="over-hidden" key={$number}>
                        <a href={$item.href} data-dsn="parallax" target="_blank" rel="nofollow">{$item.name}</a>
                    </li>)
                }
            </ul>
        </div>
    );
}

export default Social;