import React from 'react';
import {dsnCN} from "../../../hooks/helper";

// The panel beside the menu: who runs this desk and where to reach him.
function MenuContent({className}) {
    const socialData = [
        {link: "https://github.com/fullscreen-triangle", name: "GitHub."},
        {link: "https://orcid.org/0009-0009-5698-9595", name: "ORCID."},
        {link: "https://gitlab.com/k.sachikonye", name: "GitLab."},
    ];
    return (
        <div className={dsnCN('container-content  d-flex flex-column justify-content-center', className)}>
            <div className="nav__info">
                <div className="nav-content">
                    <h5 className="sm-title-block mb-10">Kundai Farai Sachikonye</h5>
                    <p>
                        Institut für Biochemie <br/> Universität Greifswald
                    </p>
                </div>
                <div className="nav-content mt-30">
                    <h5 className="sm-title-block mb-10">Contact</h5>
                    <p className="links over-hidden">
                        <a className="link-hover" href="mailto:kundai.sachikonye@uni-greifswald.de"
                           data-hover-text="kundai.sachikonye@uni-greifswald.de">kundai.sachikonye@uni-greifswald.de</a>
                    </p>
                </div>
            </div>
            <div className="nav-social nav-content mt-30">
                <div className="nav-social-inner p-relative">
                    <h5 className="sm-title-block mb-10">Elsewhere</h5>
                    <ul>
                        {socialData.map((item, index) =>
                            <li key={index}>
                                <a href={item.link} target="_blank" rel="noopener noreferrer">{item.name}</a>
                            </li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default MenuContent;
