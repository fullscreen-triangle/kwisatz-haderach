import ButtonProject from "../../components/button/ButtonProject";
import TitleSection from "../../components/heading/TitleSection";
import ParallaxImage from "../../components/Image/ParallaxImage";
import FJustifiedGallery from "../../components/justified-gallery/FJustifiedGallery";
import MoveBox from "../../components/move-box/MoveBox";
import DsnGrid from "../../layout/DsnGrid";
import Layout from "../../layout/Layout";
import {getPortfolioItem} from "../../data/portfolio";
import HeaderFull from "../../components/header/HeaderFull";
import NextProject from "../../components/next/NextProject";

function Project4() {
    const heroData = getPortfolioItem('principal-garden');
    return (
        <Layout>
            <HeaderFull className="dsn-container"
                        alignItems="end"
                        heroContent={heroData} overlay={heroData.overlay}/>
            {/*Start Intro Project*/}
            <section className="intro-project container section-margin">
                <DsnGrid customGrid={{desktop:"40% 60%"}}>
                    <div className="intro-project-left">
                        <h4 className="title-block text-uppercase mb-20">Project</h4>
                        <ul className="intro-project-list">
                            <li className="p-relative">
                                <strong>Agency</strong>Read Full Article
                            </li>
                            <li className="p-relative">
                                <strong>creating</strong>932 Designs
                            </li>
                            <li className="p-relative">
                                <strong> Published</strong>June 5th 2020
                            </li>
                        </ul>
                    </div>
                    <div className="intro-project-right">
                        <h4 className="title-block text-uppercase mb-20">info</h4>
                        <p className="intro-project-description">
                            Nestled in a quiet enclave along the recreational waterway of
                            Alexandra Canal, on the fringe of the embassy district, Principal
                            Garden reflects a new daring in residential design thinking that
                            purposefully seeks to maximise unbuilt space amid the density of
                            urban Singapore.
                        </p>
                        <div className="intro-project-cat mt-30">
                            <span className="cat-item">Architecture </span>
                            <span className="cat-item">Photography</span>
                            <span className="cat-item">nterior Design</span>
                        </div>
                        <ButtonProject
                            href="https://www.behance.net/gallery/98338319/Principal-Garden-I"
                            target="_blank"
                            className="mt-30"
                        >
                            VISIT PROJECT
                        </ButtonProject>
                    </div>
                </DsnGrid>
            </section>
            {/*End Intro Project*/}

            <FJustifiedGallery
                images={[
                    {
                        src: "/img/project/project4/3.jpg",
                        caption: "Web Design",

                    },
                    {
                        src: "/img/project/project4/4.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/5.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/6.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/7.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/8.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/9.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/10.jpg",
                        caption: "Web Design",
                    },
                    {
                        src: "/img/project/project4/11.jpg",
                        caption: "Web Design",
                    },
                ]}
                className="section-margin"
            />

            {/*Start Box Info Move Content*/}
            <div className="p-relative section-margin v-light">
                <ParallaxImage src="/img/project/project4/12.jpg" overlay={2} alt={""}/>
                <MoveBox>
                    <TitleSection className={`align-items-start mb-30`}
                                  defaultSpace={false}>
                        A simple space for a wonderful family.
                    </TitleSection>


                    <p className="mb-10">Nestled in a quiet enclave along the recreational waterway of Alexandra Canal,
                        on the fringe of the embassy district</p>
                    <p>Principal Garden reflects a new daring in residential design thinking that purposefully seeks to
                        maximise unbuilt space amid the density of urban Singapore.</p>

                </MoveBox>
            </div>
            {/*End Box Info Move Content*/}

            <NextProject heroContent={getPortfolioItem('small-silver-car')} number={5}/>


        </Layout>
    );
}

export default Project4;
