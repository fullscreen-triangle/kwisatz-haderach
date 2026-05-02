import BoxGallery, {
    BoxGalleryItem,
} from "../../components/box-gallery/BoxGallery";
import Button from "../../components/button/Button";
import ButtonProject from "../../components/button/ButtonProject";
import TitleCover from "../../components/heading/TitleCover";
import TitleSection from "../../components/heading/TitleSection";
import ParallaxImage from "../../components/Image/ParallaxImage";
import DsnGrid from "../../layout/DsnGrid";
import Layout from "../../layout/Layout";
import HeaderFull from "../../components/header/HeaderFull";
import {getPortfolioItem} from "../../data/portfolio";
import NextProject from "../../components/next/NextProject";


function Project1() {

    const heroData = getPortfolioItem('maybe-speaker');
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
                                <strong>Agency</strong> Immersive interactive gallery
                            </li>
                            <li className="p-relative">
                                <strong>creating</strong> Elia Pirazzo
                            </li>
                            <li className="p-relative">
                                <strong> Published</strong> March 17th 2016
                            </li>
                        </ul>
                    </div>
                    <div className="intro-project-right">
                        <h4 className="title-block text-uppercase mb-20">info</h4>
                        <p className="intro-project-description">
                            Vin tries to reflect Diesel’s vision and combines the universe of
                            the rock of the 80’s with a clear and essential design to be more
                            confident with its customers who need strong symbols through which
                            express themselves
                        </p>
                        <div className="intro-project-cat mt-30">
                            <span className="cat-item"> Arthur Kenzo</span>
                            <span className="cat-item"> Smart Speaker </span>
                            <span className="cat-item">Voice Speaker </span>
                            <span className="cat-item">design</span>
                        </div>
                        <ButtonProject href="#0" className="mt-30">
                            VIST PROJECT
                        </ButtonProject>
                    </div>
                </DsnGrid>
            </section>
            {/*End Intro Project*/}

            {/*Start Parallax Img*/}
            <ParallaxImage
                alt={""}
                src={"/img/project/project1/2.jpg"}
                overlay={3}
                caption="asdsadsa"
            />
            {/*End Parallax Img*/}


            {/*Start Gallery List*/}
            <BoxGallery className="section-margin container" col={3}>
                <BoxGalleryItem
                    src="/img/project/project1/3.jpg"
                    groupPopup="gallery"
                />
                <BoxGalleryItem
                    src="/img/project/project1/4.jpg"
                    groupPopup="gallery"
                />
                <BoxGalleryItem
                    src="/img/project/project1/5.jpg"
                    groupPopup="gallery"
                />
            </BoxGallery>
            {/*End Gallery List*/}

            {/*Start Parallax Img*/}
            <ParallaxImage
                alt={""}
                src={"/img/project/project1/6.jpg"}
                caption="asdsadsa"
            />
            {/*End Parallax Img*/}

            {/*Start box vertical Section*/}
            <section className="box-gallery-vertical container section-margin">
                <DsnGrid col={2} colGap={0}>
                    <div className="p-relative mb-lg-section">
                        <div className="box-im w-100 h-100 p-absolute">
                            <ParallaxImage
                                alt={""}
                                src={"/img/project/project1/7.jpg"}
                                height="100%"
                            />
                        </div>
                    </div>
                    <div className="p-relative pt-lg-section">
                        <div className="box-info h-100 box-padding background-section ">
                            <TitleCover>speaker</TitleCover>
                            <TitleSection
                                className={"text-uppercase mb-30"}
                                defaultSpace={false}
                            >
                                Maybe speaker
                            </TitleSection>

                            <p>
                                A system that young people around the world with a club culture
                                and techno enthusiasts feel identified. We generated a simple
                                logo that is the basis for generating a geometric and liquid
                                system.
                            </p>
                            <p className="mt-15">
                                A system that young people around the world with a club culture
                                and techno enthusiasts feel identified. We generated a simple
                                logo that is the basis for generating a geometric and liquid
                                system.
                            </p>
                            <Button href="#0" className="mt-30">
                                View More <span className="icon">⟶</span>
                            </Button>
                        </div>
                    </div>
                </DsnGrid>
            </section>
            {/*End box vertical Section*/}

            <NextProject heroContent={getPortfolioItem('yaren-collection')} number={2}  />
        </Layout>
    );
}

export default Project1;
