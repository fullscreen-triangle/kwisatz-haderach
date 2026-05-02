import React from "react";
import {dsnCN} from "../../hooks/helper";
import Social from "./Social";
import ScrollToTop from "./ScrollToTop";
import Copyright from "./Copyright";


function Footer({className}) {
    return (

        <footer className={dsnCN("footer p-relative", className)}>
            <div className="container">
                <div className="footer-container">
                    <div className="d-flex align-items-center h-100">
                        <div className="column-left">
                            <Social/>
                        </div>

                        <ScrollToTop />

                        <div className="column-right">
                            <Copyright />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}


export default Footer;