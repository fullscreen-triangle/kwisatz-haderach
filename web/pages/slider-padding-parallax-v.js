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
                    typeBg={"padding-image"}
                    className={"align-items-center justify-content-center text-center pb-40"}
                    classNameSlider={"dsn-container"}
                    optionSlider={{
                        direction:"vertical",
                        spaceBetween:0,
                        speed : 1200
                    }}
                    parallaxSwiper={{
                        "data-swiper-parallax-scale" : "1.02",
                        "data-swiper-parallax-y" : "50%",
                    }}
                    metaData={{separateCat: null  , hasDescription:false}}
                    alignControlNav={"center"}
                    tag="header"
                />


        </Layout>
    );
}

export default Home;
