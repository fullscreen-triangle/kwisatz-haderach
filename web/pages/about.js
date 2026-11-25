import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from "react";
import HeaderNormal from "../components/header/HeaderNormal";
import TitleSection from "../components/heading/TitleSection";
import {faCheck} from "@fortawesome/free-solid-svg-icons";
import List from "../components/list/List";
import DsnGrid from "../layout/DsnGrid";
import Layout from "../layout/Layout";
import Team from "../components/Team/Team";
import NextPage from "../components/next/NextPage";
import Awards from "../components/awards/Awards";
import {getTeamData} from "../data/team";
import Service from "../components/services/Service";
import {getServiceData} from "../data/service";
import ModalContact from "../components/model-right/ModalContact";
import Head from "next/head";

// About Kundai: the profile from his CV, the current post from his records. The theme's
// agency copy, stock gallery, invented testimonials and client logos are gone.
function About() {
    TitleSection.defaultProps = {
        classDesc: "line-shape line-shape-before",
        classDesInner: "line-bg-right",
    };

    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>
            <Head>
                <title>About | Kundai Farai Sachikonye</title>
            </Head>
            <HeaderNormal className="">
                <p className="subtitle p-relative line-shape line-shape-after mb-30">
                    <span className="pl-10 pr-10 background-section">Universität Greifswald · Institut für Biochemie</span>
                </p>
                <h1 className="title text-uppercase">
                    Kundai Farai <br/> Sachikonye
                </h1>
            </HeaderNormal>

            <div className="container section-margin" data-dsn-title="About">
                <TitleSection className="mb-15" description={"What I do"} defaultSpace={false}/>
                <DsnGrid col={2} colTablet={1}>
                    <div className="box-left">
                        <h4>Computational biologist: multi-omics, systems biology and mass spectrometry, from method to deployed tool.</h4>
                    </div>
                    <div className="box-right">
                        <p className="max-w570 dsn-up mb-15 ">
                            I work across genomics and transcriptomics, proteomics and metabolomics, and systems-biology
                            modelling, including metabolic networks built from thermodynamic and kinetic parameters. I
                            combine machine learning with rigorous software engineering, validate against authoritative
                            reference data, and design the controls that can show a method wrong.
                        </p>
                        <p className="max-w570 dsn-up">
                            Since September 2026 I am a Wissenschaftlicher Mitarbeiter at the Institut für Biochemie of
                            the Universität Greifswald, working on research data for catalysis (NFDI4Cat).
                        </p>
                    </div>
                </DsnGrid>
                <List className="pt-50 mt-50 border-top pt-md-30 mt-md-30" col={3} iconSize={"21px"}>
                    <List.item icon={<FontAwesomeIcon icon={faCheck} className="theme-color"/>}
                               className="align-items-center"> Mass spectrometry since 2013 </List.item>
                    <List.item icon={<FontAwesomeIcon icon={faCheck} className="theme-color"/>}
                               className="align-items-center"> Python · Rust · TypeScript</List.item>
                    <List.item icon={<FontAwesomeIcon icon={faCheck} className="theme-color"/>}
                               className="align-items-center"> Works in English and German</List.item>
                </List>
            </div>

            <section className="section-padding background-section" data-dsn-title="Work">
                <div className="container">
                    <TitleSection description="What I work on">
                        From the instrument <br/> to the model.
                    </TitleSection>
                    <Service.grid className="icon-left" styleBox="list" data={getServiceData()}/>
                </div>
            </section>

            <section className="awards-section section-margin" data-dsn-title="Roles">
                <div className="container">
                    <TitleSection description={"Editorial and reviewing"} defaultSpace={false}>
                        Roles in journals.
                    </TitleSection>
                    <Awards/>
                </div>
            </section>

            <section className="container section-margin " data-dsn-title="Contact">
                <TitleSection description={"Who"}>
                    Get in touch.
                </TitleSection>
                <Team data={getTeamData()} col={2} colTablet={2}/>
            </section>

            <NextPage className={`background-section section-padding`}/>
        </Layout>
    );
}

export default About;
