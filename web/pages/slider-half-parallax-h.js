import React from "react";
import Layout from "../layout/Layout";
import SliderPortfolio from "../components/slider-portfolio/SliderPortfolio";

import ModalContact from "../components/model-right/ModalContact";
import Head from "next/head";

function Home() {



    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>
            <Head>
                <title>Portfolio  | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>
            <SliderPortfolio
                typeBg="half-image"
                className={"align-items-center pb-80"}
                classNameSlider={"content-left"}
                parallaxSwiper={{
                    "data-swiper-parallax-scale" : "1.1",
                    "data-swiper-parallax-x" : "40%",
                }}
                alignControlNav="start"
                metaData={{hasSeparator: false , separateCat:null}}

                tag="header"
            />
        </Layout>
    );
}

export default Home;
