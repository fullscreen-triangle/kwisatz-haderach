import Layout from "../layout/Layout";
import HeaderFull from "../components/header/HeaderFull";
import Button from "../components/button/Button";
import TitleSection from "../components/heading/TitleSection";
import DsnGrid from "../layout/DsnGrid";
import Skills, {SkillCircleBar} from "../components/skill/Skills";

import ButtonPopup from "../components/button-popup/ButtonPopup";
import HeroSectionPersonal from "../components/hero-section/HeroSectionPersonal";
import Resume from "../components/resume/Resume";
import ServiceTow from "../components/services/grid/ServiceTow";
import PortfolioSwiper from "../components/portfolio/PortfolioSwiper";
import SwiperPagination from "../components/swiper-pagination/SwiperPagination";
import Testimonial from "../components/testimonial/Testimonial";
import BlogSwiper from "../components/bolg/BlogSwiper";
import NextPage from "../components/next/NextPage";
import ParallaxImage from "../components/Image/ParallaxImage";
import ModalContact from "../components/model-right/ModalContact";
import React from "react";
import Footer from "../components/footer/Footer";
import Head from "next/head";

const headerContent = {
    title: `Frontend-developer`,
    subtitle: `<span class="background-section pl-15 pr-15 pt-5 pb-5 d-inline-block">Alex Smith</span>`,
    src: "/img/personal.jpg",
};

function Personal() {
    TitleSection.defaultProps = {
        classDesc: "line-shape line-shape-before",
        classDesInner: "line-bg-right",
    };

    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>
            <Head>
                <title>Personal  | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>
        <HeaderFull
                className="dsn-container"
                fullWidth
                heroContent={headerContent}
                overlay={6}
            >
                <p className="mt-30 pb-30 border-bottom max-w570">
                    Fusce tempor magna mi, non egestas velit ultricies nec. Aenean
                    convallis, risus non condimentum gravida, odio mauris ullamcorper
                    felis, ut venenatis purus ex eu mi. Quisque imperdiet lacinia urna, a
                    placerat sapien pretium eu.
                </p>

                <div className="d-flex align-items-center mt-30">
                    <Button
                        href={"/services"}
                        className="mr-15 line-head"
                        borderStyle={"border-color-theme-color"}
                        borderRadius
                    >
                        About Me
                    </Button>
                    <ButtonPopup
                        className="no-height"
                        href={"https://www.youtube.com/watch?v=mRvqcvqB4EI"}
                        textAfter="Play Video"
                    />
                </div>
            </HeaderFull>
            {/*<!-- ========== About Section ========== */}
            <section className="container about-me p-relative section-margin " data-dsn-title="About Me">
                <HeroSectionPersonal/>
            </section>
            {/*<!-- ========== End About Section ========== */}

            {/*<!-- ========== Resume Section ========== */}
            <section className="section-padding  background-section" data-dsn-title="Resume">
                <div className="container">
                    <TitleSection description="My Resume">
                        Education & Experience
                    </TitleSection>
                    <DsnGrid col={2}>
                        <Resume title="Education">
                            <Resume.item title="University of Studies">
                                <p className="max-w570">
                                    Duis posuere, quam non imperdiet egestas, eros enim mattis
                                    mauris, in posuere lacus arcu quis felis. Etiam interdum erat
                                    non enim venenatis fermentum.
                                </p>
                            </Resume.item>

                            <Resume.item title="Doctoral Degree">
                                <p className="max-w570">
                                    Aliquam tincidunt malesuada tortor vitae iaculis. In eu turpis
                                    iaculis, feugiat risus quis, aliquet urna. Quisque fringilla
                                    mollis risus, eu pulvinar dolor.
                                </p>
                            </Resume.item>

                            <Resume.item title="University of Studies">
                                <p className="max-w570">
                                    Maecenas finibus nec sem ut imperdiet. Ut tincidunt est ac
                                    dolor aliquam sodales. Phasellus sed mauris hendrerit, laoreet
                                    sem in, lobortis ante.
                                </p>
                            </Resume.item>
                        </Resume>

                        <Resume title="Education">
                            <Resume.item title="University of Studies">
                                <h6>Senior UX / UI Designer</h6>
                                <p className="max-w570 mt-10">
                                    Praesent dignissim sollicitudin justo, sed elementum quam
                                    lacinia quis. Phasellus eleifend tristique posuere. Sed vitae
                                    dui nec magna.
                                </p>
                            </Resume.item>

                            <Resume.item title="Doctoral Degree">
                                <h6>DDB Athens ( Tribal )</h6>
                                <p className="max-w570 mt-10">
                                    Maecenas tempus faucibus rutrum. Duis eu aliquam urna. Proin
                                    vitae nulla tristique, ornare felis id, congue libero. Nam
                                    volutpat euismod quam.
                                </p>
                            </Resume.item>

                            <Resume.item title="Freelancer">
                                <h6>DDB Athens ( Tribal )</h6>
                            </Resume.item>
                        </Resume>
                    </DsnGrid>
                </div>
            </section>
            {/*<!-- ========== End Resume Section ========== */}

            {/*<!-- ========== Services Section ========== */}
            <section className="section-margin container" data-dsn-title="Services">
                <DsnGrid col={2} colTablet={1} rowGapTablet={60}>
                    <div className="text-left flex-column align-items-center w-100">
                        <div className="flex-column align-items-center mb-30">
                            <div className="section-title mb-20 ">
                                <p className="sub-heading  line-bg-left mb-15">
                                    My specialization
                                </p>
                                <h4 className="text-left title-cap">
                                    I am a trending designer who cares about the details
                                </h4>
                            </div>
                        </div>
                        <h5 className="sm-title-block theme-color">
                            Proin laoreet elementum ligula
                        </h5>

                        <div className="border-bottom mt-30 mb-30"/>

                        <p className="max-w570 dsn-text">
              <span className="mb-20">
                I will help you build your brand and grow your business. I
                create clarifying strategy, beautiful logo and identity design.{" "}
              </span>
                            <span>
                Donec massa velit, varius a accumsan ac, tempor iaculis massa.
                Sed placerat justo sed libero varius vulputate. Ut a mi tempus
                massama lesuada fermentum.
              </span>
                        </p>

                        <div className="border-bottom mt-30 mb-30"/>

                        <Button
                            href={"/services"}
                            className="mr-15 line-head"
                            borderStyle={"border-color-theme-color"}
                            borderRadius
                        >
                            More Service
                        </Button>
                    </div>

                    <ServiceTow className="services-no-padding" masonry />
                </DsnGrid>
            </section>
            {/*<!-- ========== End Services Section ========== */}

            <div className="p-relative section-padding" data-dsn-title="Skills">

                <div className="box-im box-im-100 h-100 p-absolute top-0 over-hidden">
                    <ParallaxImage alt={""} src={"/img/header.jpg"}
                                   height={"100%"} heightMobile={"100%"} heightTable={"100%"}
                                   overlay={7} animationActive={false}/>
                </div>


                <Skills className="container p-relative  z-index-1" col={4} colTablet={2}>
                    <SkillCircleBar number={80}>WEB DESIGN</SkillCircleBar>
                    <SkillCircleBar number={60}>PHOTOSHOP</SkillCircleBar>
                    <SkillCircleBar number={40}>Graphic Design</SkillCircleBar>
                    <SkillCircleBar number={90}>Smarty / Twig</SkillCircleBar>
                </Skills>
            </div>

            {/*Start Portfolio*/}
            <div className="section-margin" data-dsn-title="Our Portfolio">
                <TitleSection
                    className={`container align-items-center text-center`}
                    description={"Our Works"}
                >
                    Creative Portfolio <br/>
                    Designs
                </TitleSection>
                <PortfolioSwiper
                    grabCursor
                    desktop={{spaceBetween: 50, slidesPerView: 1.5}}
                    tablet={{spaceBetween: 0, slidesPerView: 1.25}}
                    mobile={{spaceBetween: 0, slidesPerView: 1}}
                    stylePortfolio="work-section"
                    className="v-dark-head"
                    centeredSlides
                    loop
                    blur
                    parallax
                    speed={1200}
                    watchSlidesProgress
                    loopedSlides={2}
                    parallaxImage={{"data-swiper-parallax-scale": "0.85"}}
                    parallaxContent={{"data-swiper-parallax-opacity": "0"}}
                >
                    <SwiperPagination
                        className={`justify-content-between dsn-container mb-30`}
                    />
                </PortfolioSwiper>
            </div>
            {/*End Portfolio*/}

            <Testimonial
                className="container section-margin"
                title="Feedback from our clients."
                skin={["testimonials-half"]}
                backgroundColor={"background-section"}
                desktop={{slidesPerView: 2}}
                speed={1000}
                grabCursor
                loop
                loopedSlides={2}
                parallax
                parallaxImage={{"data-swiper-parallax-scale": 0.7}}
                parallaxContent={{
                    "data-swiper-parallax-opacity": 0,
                    "data-swiper-parallax": "30%",
                }}
                data-dsn-title="testimonials"
            >
                <SwiperPagination
                    className={`justify-content-between dsn-container mt-30`}
                />
            </Testimonial>
            {/*End testimonial Section*/}

            {/*Start Blog*/}
            <div className="section-margin" data-dsn-title="Lasts post">
                <TitleSection
                    className={`container  align-items-center text-center`}
                    description={"Lasts post"}
                >
                    Latest And Greatest <br/>
                    Post
                </TitleSection>
                <BlogSwiper
                    grabCursor
                    desktop={{spaceBetween: 50, slidesPerView: 1.5}}
                    tablet={{spaceBetween: 20, slidesPerView: 1.25}}
                    mobile={{spaceBetween: 0, slidesPerView: 1}}
                    centeredSlides
                    loop
                    blur
                    parallax
                    speed={1200}
                    watchSlidesProgress
                    loopedSlides={2}
                    parallaxImage={{"data-swiper-parallax-scale": "0.85"}}
                >
                    <SwiperPagination
                        className={`justify-content-between dsn-container mt-30`}
                    />
                </BlogSwiper>
            </div>
            {/*End Blog*/}

            {/*========== Next Page ==========*/}
            <NextPage className="section-padding border-top background-section"/>
            {/*========== End Next Page ==========*/}

            {/*========== Footer ==========*/}
            <Footer className="background-section"/>
            {/*========== End Footer ==========*/}
        </Layout>
    );
}

export default Personal;
