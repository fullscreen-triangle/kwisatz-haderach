import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faShareAlt} from "@fortawesome/free-solid-svg-icons/faShareAlt";
import {faGithub, faGitlab, faOrcid} from '@fortawesome/free-brands-svg-icons';
import {dsnCN} from "../../hooks/helper";

// The side share button: the same three places as the footer (components/footer/Social.jsx).
const socialData = [
    {link: "https://github.com/fullscreen-triangle", icon: faGithub, name: "GH"},
    {link: "https://orcid.org/0009-0009-5698-9595", icon: faOrcid, name: "ID"},
    {link: "https://gitlab.com/k.sachikonye", icon: faGitlab, name: "GL"},
];


function SocialOne({className="" , ...restProps}) {
    return (
        <div className={dsnCN("social-side social-network d-flex align-items-center" , className)} {...restProps}>
            <div className="icon" data-dsn="parallax">
                <FontAwesomeIcon icon={faShareAlt}/>
            </div>
            <ul className="socials d-flex flex-column p-absolute ">
                {socialData.map(($item, number) => <li key={number} style={{"--dsn-index-animate":socialData.length - number -1}}>
                    <a href={$item.link} target="_blank" rel="noreferrer">
                        <FontAwesomeIcon icon={$item.icon}/>
                        <span>{$item.name}</span>
                    </a>
                </li>)}
            </ul>
        </div>
    );
}


export default SocialOne;
