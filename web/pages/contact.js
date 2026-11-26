import React from "react";
import HeaderNormal from "../components/header/HeaderNormal";
import TitleSection from "../components/heading/TitleSection";
import Layout from "../layout/Layout";

import Map from "../components/Map/Map";
import DsnGrid from "../layout/DsnGrid";
import InfoBox from "../components/contact/InfoBox";
import ContactForm from "../components/contact/ContactForm";
import Footer from "../components/footer/Footer";
import Head from "next/head";

function About() {
    TitleSection.defaultProps = {
        classDesc: "line-shape line-shape-before",
        classDesInner: "line-bg-right",
    };

    return (
        <Layout>
            <Head>
                <title>Contact | Kundai Farai Sachikonye</title>
            </Head>
            {/*========== Header Normal ========== */}
            <HeaderNormal className="text-center">
                <p className="subtitle p-relative line-shape  mb-20">
                    <span className="pl-10 pr-10 background-section">CONTACT</span>
                </p>
                <h1 className="title text-uppercase">
                    Write to me.
                </h1>
                <p className="dsn-heading-title mt-15 max-w570">Research, data and software questions are welcome,
                    in English or German. The form opens your own mail program, addressed to me.
                </p>
            </HeaderNormal>
            {/*========== End Header Normal ==========*/}
            {/*Start Map*/}
            <Map
                mapKey="AIzaSyDMyAS2jdzj-vdgBIFaIStYOWJtSlghndg"
                zoom={10}
                height="80vh"
                defaultCenter={{lat: 54.0931, lng: 13.3878}}
            />

            {/*Start Contact Form && Info Box*/}
            <div className="section-margin container">
                <DsnGrid col={2} colTablet={1}>
                    <ContactForm/>
                    <InfoBox className="align-self-center"/>
                </DsnGrid>
            </div>


            {/*========== Start Next Page Section ==========*/}
            {/*========== End Next Page Section ==========*/}

            {/*========== Footer ==========*/}
            <Footer className="background-section"/>
            {/*========== End Footer ==========*/}
        </Layout>
    );
}

export default About;
