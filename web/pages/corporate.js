import React from "react";
import Layout from "../layout/Layout";
import TitleSection from "../components/heading/TitleSection";
import HeaderNormal from "../components/header/HeaderNormal";
import BoxRight from "../components/box-information/BoxRight";
import Button from "../components/button/Button";
import ServiceTow from "../components/services/grid/ServiceTow";
import Portfolio from "../components/portfolio/Portfolio";
import Testimonial from "../components/testimonial/Testimonial";
import SwiperPagination from "../components/swiper-pagination/SwiperPagination";
import BrandClient from "../components/brand-client/BrandClient";
import BlogSwiper from "../components/bolg/BlogSwiper";
import NextPage from "../components/next/NextPage";
import Footer from "../components/footer/Footer";
import ModalContact from "../components/model-right/ModalContact";
import Head from "next/head";


function Corporate() {


    TitleSection.defaultProps = {
        className: "align-items-center text-right text-uppercase",
        classDesc: "theme-color  line-shape line-shape-before text-uppercase",
        classDesInner: "background-section pt-5 pb-5 pl-10 pr-10",
        classTitle: "line-bg-left",
        dirDescription: "after"
    }


    return (
        <Layout  modelRight={{children:<ModalContact />,propsModal:{textBtn:"Contact"}}}>
            <Head>
                <title>Corporate | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>
        {/*========== Header Normal ========== */}
            <HeaderNormal className="align-content-center text-center">
                <h1 className="title text-uppercase"> digital Creative <br/> Agency </h1>
                <p className="subtitle p-relative line-shape mt-30">
                    <span className="pl-10 pr-10 background-section">DESIGN STUDIO</span>
                </p>
            </HeaderNormal>
            {/*========== End Header Normal ==========*/}

            {/*========== About box Normal ========== */}
            <div className="p-relative" data-dsn-title="About">
                <BoxRight className="v-light" src={"/img/corporate.jpg"} alt={""} parallaxFrom={{scale: 1.2}}
                          parallax={{scale: 1}}>
                    <TitleSection className="align-items-start text-right mb-50" description={"Services"}
                                  defaultSpace={false}>
                        Big Data Services
                    </TitleSection>
                    <p className="mb-15">We are Leading International Consulting Specializingin Business &
                        Financial Investment.</p>

                    <p className="mb-15">On the other hand we denounce with righteous indignation and dislike
                        men who are so beguiled and demoralized by & charms of pleasure of the moment so
                        blinded.</p>

                    <p>A system that young people around the world with a club culture and techno
                        enthusiasts feel identified. We generated a simple logo that is the basis for
                        generating a geometric and liquid system. </p>
                    <Button className="mt-30" href="about" borderStyle={"border-color-theme-color"} borderRadius>
                        About Us
                    </Button>
                </BoxRight>
            </div>

            {/*========== End About box Normal ==========*/}


            {/*Start Service*/}
            <div className="container section-margin" data-dsn-title="our Services">
                <TitleSection description={"Our Services"}>
                    Branding Agency
                </TitleSection>
                <ServiceTow className={"icon-left"}/>
            </div>
            {/*End Service*/}

            {/*========== Work Section ========== */}
            <div className="container section-margin" data-dsn-title="our Work">
                <TitleSection description={"Our Works"}>
                    AWESOME DESIGNS
                </TitleSection>
                <Portfolio
                    stylePortfolio={"work-classic"}
                    useFilter
                    filterClass="text-center"
                    styleBox={"line"}
                    col={3} colTablet={2} colMobile={1} rowGapMobile={50}
                    colGap={50} rowGap={80}
                />
            </div>
            {/*========== End Work Section ==========*/}

            {/*Start testimonial Section*/}
            <div className="container section-margin" data-dsn-title="Testimonial">

                <TitleSection description={"Feedback"}>
                    What People Saying
                </TitleSection>
                <Testimonial className="text-center"
                             styleBox={"corner"}
                             skin={["testimonials-personal", "box-line"]}
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



            {/*Start Blog*/}
            <div className="container section-margin" data-dsn-title="our Blog">
                <TitleSection
                              description={"Lasts post"}>
                    Latest And Greatest Post
                </TitleSection>
                <BlogSwiper className={"our-blog-classic"}
                            hideMetaData={["description"]}
                            grabCursor
                            desktop={{spaceBetween: 30, slidesPerView: 3}}
                            tablet={{centeredSlides : false ,  slidesPerView: 2}}
                            mobile={{spaceBetween: 0,  slidesPerView: 1}}
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
            {/*========== End brand-client Section ==========*/}


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



