import BoxGallery, {
    BoxGalleryItem,
} from "../../components/box-gallery/BoxGallery";
import ButtonProject from "../../components/button/ButtonProject";
import ParallaxImage from "../../components/Image/ParallaxImage";
import DsnGrid from "../../layout/DsnGrid";
import Layout from "../../layout/Layout";
import {getPortfolioItem} from "../../data/portfolio";
import HeaderFull from "../../components/header/HeaderFull";
import NextProject from "../../components/next/NextProject";

function Project6(params) {
    const heroData = getPortfolioItem('lengshuikeng');
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
                                <strong>Agency</strong>Clint Davis
                            </li>
                            <li className="p-relative">
                                <strong>creating</strong>Bo wen HUANG
                            </li>
                            <li className="p-relative">
                                <strong> Published</strong>November 17th 2019
                            </li>
                        </ul>
                    </div>
                    <div className="intro-project-right">
                        <h4 className="title-block text-uppercase mb-20">info</h4>
                        <p className="intro-project-description">
                            The Lengshuikeng region is a low-lying depression which was
                            created when the lava from Mt. Qixing and Mt. Qigu formed a
                            barrage. Water then accumulated, turning the area into a lake,
                            which eventually leaked out and dried up to expose the lake bottom
                            and form today is landscape.
                        </p>
                        <div className="intro-project-cat mt-30">
                            <span className="cat-item">automotive</span>
                            <span className="cat-item">Photography</span>
                        </div>
                        <ButtonProject
                            href="https://www.behance.net/gallery/88246491/-Lengshuikeng?tracking_source=curated_galleries_photography"
                            target="_blank"
                            className="mt-30"
                        >
                            VIST PROJECT
                        </ButtonProject>
                    </div>
                </DsnGrid>
            </section>
            {/*End Intro Project*/}

            {/*Start Parallax Img*/}
            <ParallaxImage
                alt={""}
                src={"/img/project/project6/2.jpg"}
                caption="PHOTOGRAPHY"
            />
            {/*End Parallax Img*/}

            {/*Start Gallery List*/}
            <div className="mt-section mb-sm-section has-in-halg-bg p-relative">
                <div className="p-absolute half-bg-bottom w-100 d-sm-none h-50 bottom-0 left-0  v-light" />
                <div className="dsn-container">
                    <BoxGallery col={2}>
                        <BoxGalleryItem
                            src="/img/project/project6/3.jpg"
                            groupPopup="gallery"
                        />
                        <BoxGalleryItem
                            src="/img/project/project6/4.jpg"
                            groupPopup="gallery"
                        />
                    </BoxGallery>
                </div>
            </div>
            {/*End Gallery List*/}

            {/*Start Intro Project*/}
            <section className="text-center section-padding v-light">
                <div className="container">
                    <div className="max-w750 ml-auto mr-auto">
                        <h4 className="title-block dsn-text mb-20 words splitting overflow-hidden">
                            The Small Silver Car That Changed Everything
                        </h4>
                        <p className="dsn-up">
                            What you see in this blog post pales vastly in comparison to the
                            painstaking attention to detail showcased in 000. A fine-toothed
                            comb driven by a team of true Porsche enthusiasts has formed one
                            of the finest pieces of automotive research, journalism, and
                            photography in existence.
                        </p>
                    </div>
                </div>
            </section>
            {/*End Intro Project*/}

            {/*Start Gallery List*/}
            <div className="mb-section has-in-halg-bg p-relative mt-sm-section">
                <div className="p-absolute half-bg-bottom d-sm-none w-100 h-50 top-0 left-0  v-light"/>
                <div className="dsn-container">
                    <BoxGallery col={2}>
                        <BoxGalleryItem
                            src="/img/project/project6/5.jpg"
                            groupPopup="gallery"
                        />
                        <BoxGalleryItem
                            src="/img/project/project6/6.jpg"
                            groupPopup="gallery"
                        />
                    </BoxGallery>
                </div>
            </div>
            {/*End Gallery List*/}

            {/*Start Parallax Img*/}
            <ParallaxImage
                className="section-margin p-relative"
                alt={""}
                src={"/img/project/project6/7.jpg"}
                caption="PHOTOGRAPHY"
            />
            {/*End Parallax Img*/}

            {/*Start Gallery List*/}
            <div className="section-margin p-relative">
                <div className="dsn-container">
                    <BoxGallery col={4}>
                        <BoxGalleryItem
                            src="/img/project/project6/8.jpg"
                            groupPopup="gallery"
                        />
                        <BoxGalleryItem
                            src="/img/project/project6/9.jpg"
                            groupPopup="gallery"
                        />

                        <BoxGalleryItem
                            src="/img/project/project6/10.jpg"
                            groupPopup="gallery"
                        />

                        <BoxGalleryItem
                            src="/img/project/project6/11.jpg"
                            groupPopup="gallery"
                        />
                    </BoxGallery>
                </div>
            </div>
            {/*End Gallery List*/}
            <NextProject heroContent={getPortfolioItem('maybe-speaker')} number={1}/>

        </Layout>
    );
}

export default Project6;
