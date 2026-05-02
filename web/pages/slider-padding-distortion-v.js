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
                    className={"align-items-end pb-40"}
                    classNameSlider={"dsn-container"}
                    webgel
                    webgelOptions={{
                        displacement: "/img/displacement/8.jpg",
                        speedIn: 3.5,
                    }}
                    optionSlider={{
                        direction:"vertical",
                        spaceBetween:0,
                        speed : 1200
                    }}

                    metaData={{separateCat: null  , hasDescription:false}}
                    alignControlNav={"end"}
                    tag="header"
                />


        </Layout>
    );
}

export default Home;
