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

function Project5(params) {
    const heroData = getPortfolioItem('small-silver-car');
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
                                <strong>creating</strong>Justin Page
                            </li>
                            <li className="p-relative">
                                <strong> Published</strong>October 28th 2017
                            </li>
                        </ul>
                    </div>
                    <div className="intro-project-right">
                        <h4 className="title-block text-uppercase mb-20">info</h4>
                        <p className="intro-project-description">
                            Yep, bankruptcy. In 1986, Porsche global sales had plummeted from
                            a high of 53,000, to just 14,000 in 1993. The numbers are
                            staggering, but this is no secret Porsche will deny. The same
                            company that built a legacy of racing thoroughbreds, and works of
                            art that hang in children’s rooms everywhere were desperate for a
                            new direction.
                        </p>
                        <div className="intro-project-cat mt-30">
                            <span className="cat-item">automotive</span>
                            <span className="cat-item">car</span>
                            <span className="cat-item">Photography</span>
                        </div>
                        <ButtonProject
                            href="https://www.behance.net/gallery/57884873/The-Small-Silver-Car-That-Changed-Everything"
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
                src={"/img/project/project5/2.jpg"}
                caption="PHOTOGRAPHY"
            />
            {/*End Parallax Img*/}

            {/*Start Gallery List*/}
            <BoxGallery className="section-margin container" col={2}>
                <BoxGalleryItem
                    src="/img/project/project5/3.jpg"
                    groupPopup="gallery"
                />
                <BoxGalleryItem
                    src="/img/project/project5/4.jpg"
                    groupPopup="gallery"
                />
            </BoxGallery>
            {/*End Gallery List*/}

            {/*Start Parallax Img*/}
            <ParallaxImage
                alt={""}
                src={"/img/project/project5/5.jpg"}
                caption="PHOTOGRAPHY"
            />
            {/*End Parallax Img*/}

            {/*Start Intro Project*/}
            <section className="section-padding v-light">
                <div className="container">
                    <div className="max-w750">
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

            <NextProject heroContent={getPortfolioItem('lengshuikeng')} number={6}  />

        </Layout>
    );
}

export default Project5;
