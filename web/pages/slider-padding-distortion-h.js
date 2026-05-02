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
                    className={"align-items-center justify-content-center text-center pb-80"}
                    classNameSlider={"dsn-container"}
                    webgel
                    webgelOptions={{
                        displacement: "/img/displacement/7.jpg",
                        speedIn: 3.5,
                    }}
                    optionSlider={{

                        spaceBetween:0,
                        speed : 1200
                    }}

                    metaData={{separateCat: null  , hasDescription:true}}
                    alignControlNav={"end"}
                    tag="header"
                />


        </Layout>
    );
}

export default Home;
