import BoxGallery, {
    BoxGalleryItem,
} from "../../components/box-gallery/BoxGallery";
import ButtonProject from "../../components/button/ButtonProject";
import DsnGrid from "../../layout/DsnGrid";
import Layout from "../../layout/Layout";
import HeaderFull from "../../components/header/HeaderFull";
import {getPortfolioItem} from "../../data/portfolio";
import NextProject from "../../components/next/NextProject";
import Image from "next/image";

function Project2(params) {
    const heroData = getPortfolioItem('yaren-collection');
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
                                <strong>Agency</strong>Immersive interactive gallery
                            </li>
                            <li className="p-relative">
                                <strong>creating</strong>vere
                            </li>
                            <li className="p-relative">
                                <strong> Published</strong>April 2nd 2019
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

            {/*Start Img*/}
            <div className="container p-relative">
                <Image className="w-100" alt={""} src={"/img/project/project2/2.jpg"}  width={1400} height={688} sizes="(max-width: 768px) 100vw,(max-width: 1200px) 75vw,100vw"/>
            </div>
            {/*End Img*/}

            {/*Start Gallery List*/}
            <BoxGallery className="section-margin container" col={2}>
                <BoxGalleryItem
                    src="/img/project/project2/3.jpg"
                    groupPopup="gallery"
                />
                <BoxGalleryItem
                    src="/img/project/project2/4.jpg"
                    groupPopup="gallery"
                />
            </BoxGallery>
            {/*End Gallery List*/}

            {/*Start Img*/}
            <div className="container p-relative">
                <Image className="w-100" alt={""} src={"/img/project/project2/5.jpg"} width={1400} height={688} sizes="(max-width: 768px) 100vw,(max-width: 1200px) 75vw,100vw"/>
            </div>
            {/*End Img*/}

            {/*Start Gallery List*/}
            <BoxGallery className="section-margin container" col={3}>
                <BoxGalleryItem
                    src="/img/project/project2/6.jpg"
                    groupPopup="gallery"
                />
                <BoxGalleryItem
                    src="/img/project/project2/7.jpg"
                    groupPopup="gallery"
                />

                <BoxGalleryItem
                    src="/img/project/project2/8.jpg"
                    groupPopup="gallery"
                />
            </BoxGallery>
            {/*End Gallery List*/}

            {/*Start Intro Project*/}
            <section className="container section-margin">
                <DsnGrid col={2}>
                    <div>
                        <h4 className="title-block dsn-text sm-mb-20 words splitting overflow-hidden">Customisable
                            & <br/>
                            Flexible</h4>
                    </div>

                    <div>
                        <p className="dsn-up">We learned that different house have different preferences. So we decide
                            that CareDot with different color to match different interior isn’t enough. We also make the
                            alarm button customisable. This allow user to choose a symbol that make the most sense for
                            their use case scenario along with personal message surrounding it.</p>
                    </div>
                </DsnGrid>
            </section>
            {/*End Intro Project*/}

            <NextProject heroContent={getPortfolioItem('huggl-power-pack')} number={2}  />
        </Layout>
    );
}

export default Project2;
