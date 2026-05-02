import React from "react";
import Layout from "../layout/Layout";
import TitleSection from "../components/heading/TitleSection";
import HeaderNormal from "../components/header/HeaderNormal";
import PortfolioSwiper from "../components/portfolio/PortfolioSwiper";
import SwiperPagination from "../components/swiper-pagination/SwiperPagination";
import ServiceTow from "../components/services/grid/ServiceTow";
import HeroSectionThree from "../components/hero-section/HeroSectionThree";
import BgDot from "../components/header/BgDot";
import Facts from "../components/facts/Facts";
import BlogSwiper from "../components/bolg/BlogSwiper";
import HeroSectionFour from "../components/hero-section/HeroSectionFour";
import Testimonial from "../components/testimonial/Testimonial";
import Team from "../components/Team/Team";
import NextPage from "../components/next/NextPage";
import Footer from "../components/footer/Footer";
import ModalContact from "../components/model-right/ModalContact";
import {getTeamData} from "../data/team";
import Head from "next/head";



function Demo2() {


    TitleSection.defaultProps = {
        className: "align-items-start",
        classDesc: "line-shape line-shape-after text-uppercase",
        classDesInner: "line-bg-left",
        classTitle: "text-uppercase"
    }


    return (
        <Layout  modelRight={{children:<ModalContact />,propsModal:{textBtn:"Contact"}}}>

            <Head>
                <title>Creative Agency  | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>

        {/*========== Header Normal ========== */}
            <HeaderNormal className="align-content-center text-center" backgroundColor={"background-section"}>

                <p className="subtitle p-relative line-shape mb-30">
                    <span className="pl-10 pr-10 background-main">DESIGN STUDIO</span>
                </p>
                <h1 className="title text-uppercase"> We digital Creative <br/> Agency</h1>
            </HeaderNormal>
            {/*========== End Header Normal ==========*/}

            {/*Start Portfolio*/}
            <div className="p-relative dsn-under-header " data-dsn-title="Our Work">
                <div className="half-bg-top background-section h-50"/>
                <PortfolioSwiper grabCursor
                                 desktop={{spaceBetween: 50, slidesPerView: 1.5}}
                                 tablet={{spaceBetween: 20, slidesPerView: 1.25}}
                                 mobile={{spaceBetween: 0, slidesPerView: 1}}
                                 stylePortfolio="work-section"
                                 className="v-dark-head title-inherit h4"
                                 centeredSlides loop
                                 blur
                                 parallax
                                 speed={1200}
                                 watchSlidesProgress
                                 loopedSlides={2}
                                 parallaxImage={{
                                     "data-swiper-parallax-scale": "0.85" ,
                                     "data-swiper-parallax": "20%" ,
                                 }}
                                 parallaxContent={{"data-swiper-parallax-opacity": "0"}}
                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
                </PortfolioSwiper>
            </div>
            {/*End Portfolio*/}

            {/*Start Service*/}
            <div className="container section-margin" data-dsn-title="Our Services">
                <TitleSection description={"Our Services"}>
                    Let’s Check Our <br/> Services

                </TitleSection>
                <ServiceTow className={"icon-left"}/>
            </div>
            {/*End Service*/}

            {/*<!-- ========== Video Section ========== */}
            <div className="container section-margin">
                <HeroSectionThree/>
            </div>
            {/*<!-- ========== End Video Section ========== */}

            {/*<!-- ========== facts-section ==========*/}
            <div className="section-margin p-relative">
                <BgDot/>
                <BgDot rightPosition/>
                <div className="container">
                    <Facts className="text-center" col={4} colTablet={2}/>
                </div>
            </div>
            {/*<!-- ========== end facts-section ========== */}

            {/*Start Blog*/}
            <div className="section-margin" data-dsn-title="Our Blog">
                <TitleSection description={"Lasts post"} className={"container"}>
                    Latest And Greatest <br/>Post
                </TitleSection>
                <BlogSwiper className={"our-blog-classic our-blog-full-img"}
                            grabCursor
                            desktop={{spaceBetween: 0, slidesPerView: 2}}
                            tablet={{ slidesPerView: 1.5}}
                            mobile={{ slidesPerView: 1}}
                            centeredSlides loop
                            parallax
                            blur
                            speed={800}
                            watchSlidesProgress
                            loopedSlides={2}
                            parallaxContent={{"data-swiper-parallax-scale": 0.9}}
                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
                </BlogSwiper>
            </div>
            {/*End Blog*/}

            {/*<!-- ========== box-gallery-vertical Section ==========*/}
            <div className="container  section-margin">
                <HeroSectionFour/>
            </div>

            {/*<!-- ========== End box-gallery-vertical Section ========== */}

            {/*Start testimonial Section*/}
            <div className="container section-margin" data-dsn-title="Our Testimonials">
                <TitleSection description={"testimonials"}>
                    What People are <br />Saying
                </TitleSection>
                <Testimonial className="text-center"
                             skin={["testimonials-personal", "box-line", 'box-half']}
                             backgroundColor={"background-section"}
                             centeredSlides
                             desktop={{slidesPerView: 3}}
                             tablet={{slidesPerView: 1}}
                             mobile={{slidesPerView: 1}}
                             speed={1000} grabCursor loop loopedSlides={2}
                             parallax parallaxImage={{"data-swiper-parallax-scale": 0.7}}
                             parallaxContent={{"data-swiper-parallax-opacity": 0, "data-swiper-parallax": "30%"}}
                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
                </Testimonial>
            </div>
            {/*End testimonial Section*/}


            {/*========== team Section ========== */}
            <section className="container section-margin " data-dsn-title="Our Team">
                <TitleSection className={` align-items-center text-center`}
                              description={"Our Team"}>
                    The Best Team Ever!
                </TitleSection>

                <Team data={getTeamData().slice(0 , 3)} className={"team-classic"} col={3} colTablet={2} />
            </section>
            {/*========== End team Section ========== */}

            {/*========== Next Page ==========*/}
            <NextPage className="section-padding border-top background-section"/>
            {/*========== End Next Page ==========*/}

            {/*========== Footer ==========*/}
            <Footer className="background-section"/>
            {/*========== End Footer ==========*/}

        </Layout>


    )
}

export default Demo2;



