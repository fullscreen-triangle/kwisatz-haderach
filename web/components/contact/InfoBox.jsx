import React from 'react';
import {dsnCN} from "../../hooks/helper";

function InfoBox({className}) {
    return (

        <div className={dsnCN('box-info-contact', className)}>
            <ul>
                <li>
                    <h5 className="title-block mb-15">Contact</h5>
                    <div className="over-hidden mt-5">
                        <a className="link-hover" data-hover-text="kundai.sachikonye@uni-greifswald.de"
                           href="mailto:kundai.sachikonye@uni-greifswald.de">kundai.sachikonye@uni-greifswald.de</a>
                    </div>
                </li>
                <li>
                    <h5 className="title-block mb-15">Address</h5>
                    <p className="text-p">Institut für Biochemie, Universität Greifswald<br />Felix-Hausdorff-Straße 4, 17489 Greifswald</p>
                </li>
                <li>
                    <h5 className="title-block mb-15">Code</h5>
                    <div className="social-item over-hidden">
                        <a className="link-hover" data-hover-text="GitHub." href="https://github.com/fullscreen-triangle"
                           target="_blank" rel="noreferrer">GitHub.</a>
                    </div>
                    <div className="social-item over-hidden">
                        <a className="link-hover" data-hover-text="ORCID." href="https://orcid.org/0009-0009-5698-9595"
                           target="_blank" rel="noreferrer">ORCID.</a>
                    </div>
                </li>
            </ul>
        </div>

    );
}

export default InfoBox;