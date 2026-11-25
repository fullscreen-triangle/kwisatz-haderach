import Layout from "../layout/Layout";
import HeaderNormal from "../components/header/HeaderNormal";
import DsnGrid from "../layout/DsnGrid";
import TitleSection from "../components/heading/TitleSection";
import {ServiceGrid} from "../components/services/Service";
import {getServiceData} from "../data/service";
import {getPortfolioData} from "../data/portfolio";
import React from "react";
import NextPage from "../components/next/NextPage";
import Footer from "../components/footer/Footer";
import ModalContact from "../components/model-right/ModalContact";
import Head from "next/head";

// What Kundai works on, and the projects that show it (data/service.js, data/portfolio.js).
// The theme's agency page (consulting copy, stock team, fictional brands) is gone.
function Service() {
    TitleSection.defaultProps = {
        classDesInner: "line-bg-left",
    };
    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>
            <Head>
                <title>Work | Kundai Farai Sachikonye</title>
            </Head>
            <HeaderNormal backgroundColor="background-section" className="text-center">
                <p className="subtitle p-relative line-shape mb-30">
                    <span className="pl-10 pr-10 background-main">WHAT I WORK ON</span>
                </p>
                <h1 className="title">
                    From the instrument <br/> to the model.
                </h1>
            </HeaderNormal>

            <div className="container section-margin" data-dsn-title="Work">
                <ServiceGrid className="p-0" data={getServiceData()} col={3} colTablet={2}/>
            </div>

            <div className="background-section section-padding" data-dsn-title="Projects">
                <DsnGrid className="container" col={2} colTablet={1}>
                    {getPortfolioData().map(p => (
                        <div key={p.id} className="border-top pt-30">
                            <h4 className="mb-10">
                                <a href={p.href} target="_blank" rel="noreferrer">{p.title}</a>
                            </h4>
                            <p className="mb-10" style={{opacity: 0.6}}>{p.category.join(' · ')}</p>
                            <p>{p.description}</p>
                        </div>
                    ))}
                </DsnGrid>
            </div>

            <NextPage className="section-padding border-top background-section"/>
            <Footer className="background-section"/>
        </Layout>
    );
}

export default Service;
