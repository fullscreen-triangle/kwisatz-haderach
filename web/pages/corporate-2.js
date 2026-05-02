import React from "react";
import Layout from "../layout/Layout";
import TitleSection from "../components/heading/TitleSection";
import SliderPortfolio from "../components/slider-portfolio/SliderPortfolio";
import HeroSection2 from "../components/hero-section/HeroSection2";
import ServiceSwiperOne from "../components/services/swiper/ServiceSwiperOne";
import PortfolioSwiper from "../components/portfolio/PortfolioSwiper";
import Facts from "../components/facts/Facts";
import BgDot from "../components/header/BgDot";
import BlogSwiper from "../components/bolg/BlogSwiper";
import SwiperPagination from "../components/swiper-pagination/SwiperPagination";
import BrandClient from "../components/brand-client/BrandClient";
import NextPage from "../components/next/NextPage";
import Footer from "../components/footer/Footer";
import ModalContact from "../components/model-right/ModalContact";
import Head from "next/head";


const dataSlider = [{
    id: 1,
    title: `Craft Elegant <br /> Solutions`,
    href: {
        href: "#0",
        target: "_blank",
        rel: "nofollow"
    },
    buttonText: "LEARN MORE",
    subtitle: `We're a design studio that believe in the ideas`,
    src: '/img/agency.jpg',
    overlay: 6,

},
    {
        id: 2,
        title: `Crafting Digital <br/> Experiences`,

        href: {
            href: "#0",
            target: "_blank",
            rel: "nofollow"
        },
        buttonText: "LEARN MORE",
        src: '/img/header.jpg',
        subtitle: `we combine design, thinking and technical craft`,
        overlay: 6,

    },
    {
        id: 3,
        title: `Creative <br/> Solutions`,
        href: {
            href: "#0",
            target: "_blank",
            rel: "nofollow"
        },
        buttonText: "LEARN MORE",
        src: '/img/corporate.jpg',
        subtitle: `We're a design studio that believe in the ideas`,
        overlay: 6
    },]

function Corporate() {


    TitleSection.defaultProps = {
        className: "align-items-center text-center",
        classDesc: "line-shape line-shape-after",
        classDesInner: "line-bg-left"
    }


    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>

            <Head>
                <title>Corporate | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>
            <SliderPortfolio webgel
                             fullWidth
                             alignControlNav={"center"}
                             className="align-items-center justify-content-center text-center"
                             data={dataSlider}
                             webgelOptions={{displacement: "/img/displacement/8.jpg", speedIn: 3.5}}
                             metaData={{hasSeparator: false}}
            />

            {/*<!-- ========== About Section ========== */}
            <HeroSection2 className={"section-padding v-light full-width"} data-dsn-title="About Us"/>
            {/*<!-- ========== End about section ========== */}

            {/*Start Service*/}
            <div className="container section-margin" data-dsn-title="our Services">
                <TitleSection description={"WHY CHOOSE US?"}>
                    We are delivering beautiful <br/> digital products for you.
                </TitleSection>
                <ServiceSwiperOne/>
            </div>
            {/*End Service*/}

            {/*Start Portfolio*/}
            <PortfolioSwiper grabCursor
                             desktop={{spaceBetween: 0, slidesPerView: 3}}
                             tablet={{spaceBetween: 0, slidesPerView: 2 , centeredSlides: false}}
                             mobile={{spaceBetween: 0, slidesPerView: 1 , centeredSlides: false}}
                             stylePortfolio="work-section work-no-scale"
                             className="text-center v-dark-head"
                             centeredSlides loop
                             parallax
                             speed={800}
                             watchSlidesProgress
                             loopedSlides={2}
                             data-dsn-title="our Work"
            />

            {/*End Portfolio*/}
            {/*<!-- ========== facts-section ==========*/}
            <div className="section-padding p-relative background-section">
                <BgDot/>
                <BgDot rightPosition/>
                <div className="container">
                    <Facts className="text-center" col={4} colTablet={2}/>
                </div>
            </div>
            {/*<!-- ========== end facts-section ========== */}

            {/*Start Blog*/}
            <div className="container section-margin" data-dsn-title="our Blog">
                <TitleSection
                    description={"Lasts post"}>
                    Latest And Greatest <br/> Post
                </TitleSection>
                <BlogSwiper className={"our-blog-classic"}
                            hideMetaData={["description"]}
                            grabCursor
                            desktop={{spaceBetween: 30, slidesPerView: 3}}
                            tablet={{spaceBetween: 30, slidesPerView: 2,centeredSlides:false}}
                            mobile={{spaceBetween: 0, slidesPerView: 1,centeredSlides:false}}
                            centeredSlides loop
                            parallax
                            speed={1200}
                            watchSlidesProgress
                            loopedSlides={2}
                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
                </BlogSwiper>
            </div>
            {/*End Blog*/}

            {/*========== End brand-client Section ==========*/}
            <section className="container section-margin" data-dsn-title="our clients">
                <TitleSection className={`align-items-center text-center`}
                              description={"Our clients"}>
                    Successful, Our Reputation
                </TitleSection>

                <BrandClient col={4} colTablet={2} colGap={0} rowGap={0}/>
            </section>

            {/*========== Next Page ==========*/}
            <NextPage className="section-padding border-top background-section"/>
            {/*========== End Next Page ==========*/}

            {/*========== Footer ==========*/}
            <Footer className="background-section"/>
            {/*========== End Footer ==========*/}

        </Layout>


    )
}

export default Corporate;



