import Layout from "../layout/Layout";
import ModalContact from "../components/model-right/ModalContact";
import PortfolioSwiper from "../components/portfolio/PortfolioSwiper";
import React from "react";
import Head from "next/head";

function Home() {


    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>
            <Head>
                <title>Portfolio | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>
            <div className="p-relative d-flex align-items-center full-width" style={{height:"100vh"}}>
                <PortfolioSwiper grabCursor desktop={{spaceBetween: 0, slidesPerView: 1.5}}
                                 tablet={{spaceBetween: 0, slidesPerView: 1.25}}
                                 mobile={{spaceBetween: 0, slidesPerView: 1}}
                                    style={{width:"100%"}}
                                 stylePortfolio="work-section work-no-scale"
                                 className="text-center v-dark-head title-inherit title-h2"

                                 centeredSlides loop
                                 blur
                                 parallax
                                 speed={1200}
                                 watchSlidesProgress
                                 loopedSlides={2}
                                 parallaxImage={{"data-swiper-parallax-scale": "0.85"}}
                                 parallaxContent={{"data-swiper-parallax-opacity": "0"}}
                >

                </PortfolioSwiper>
            </div>

        </Layout>
    );
}

export default Home;
