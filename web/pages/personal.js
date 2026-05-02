import Layout from "../layout/Layout";
import HeaderFull from "../components/header/HeaderFull";
import Button from "../components/button/Button";
import TitleSection from "../components/heading/TitleSection";
import DsnGrid from "../layout/DsnGrid";
import Skills, {SkillProgressBar} from "../components/skill/Skills";
import BrandClientSwiper from "../components/brand-client/BrandClientSwiper";
import Facts from "../components/facts/Facts";
import ParallaxImage from "../components/Image/ParallaxImage";
import ServiceOne from "../components/services/grid/ServiceOne";
import Portfolio from "../components/portfolio/Portfolio";
import Testimonial from "../components/testimonial/Testimonial";
import SwiperPagination from "../components/swiper-pagination/SwiperPagination";
import BlogSwiper from "../components/bolg/BlogSwiper";
import NextPage from "../components/next/NextPage";
import Footer from "../components/footer/Footer";
import React from "react";
import ModalContact from "../components/model-right/ModalContact";
import Head from "next/head";


const headerContent = {
    title: `I'M Kerri Deo.`,
    subtitle: `<span class="background-section pl-15 pr-15 pt-5 pb-5 d-inline-block">Welcome</span>`,
    src: "/img/about-intro.jpg"
};

function Personal() {

    TitleSection.defaultProps = {
        className: "align-items-center text-center",
        classTitle: "text-uppercase"
    }


    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>

            <Head>
                <title>Personal  | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>

            <HeaderFull className="container" heroContent={headerContent} skin={"half-personal"} overlay={4}>

                <p className="pt-30 border-top">Fusce tempor magna mi, non egestas velit ultricies nec. Aenean
                    convallis,
                    risus non condimentum gravida, odio mauris ullamcorper felis, ut venenatis
                    purus ex eu mi. Quisque imperdiet lacinia urna, a placerat sapien pretium
                    eu.</p>


                <Button href={"/services"} className="mt-30 line-head" borderStyle={"border-color-theme-color"}
                        borderRadius>
                    About Me
                </Button>
            </HeaderFull>
            {/*<!-- ========== About Section ========== */}
            <section className="about-me container p-relative section-margin" data-dsn-title="About Me">
                <TitleSection description={"{ HELLO }"}>
                    About Me
                </TitleSection>
                <DsnGrid col={2} colTablet={1} rowGapTablet={50}>
                    <div className="box-info">
                        <h4 className="title-block mb-20">A Little Bit about Myself</h4>
                        <p className="mb-15 border-top pt-20">It is a long established fact that a reader
                            will be distracted by the readable content of a page when looking at its
                            layout.</p>
                        <p className="mb-30 border-bottom pb-20">The point of using Lorem Ipsum is that it
                            has a more-or-less normal distribution of letters, as opposed to using
                            Content here, content here, making it look like readable English.</p>
                        <Button href={"#0"}>
                            Download CV
                        </Button>

                    </div>
                    <div className="box-skills">
                        <Skills>
                            <SkillProgressBar bgColor={"pattern"} number={96}>Web Design</SkillProgressBar>
                            <SkillProgressBar bgColor={"pattern"} number={94}>JavaScript</SkillProgressBar>
                            <SkillProgressBar bgColor={"pattern"} number={87}>PHP</SkillProgressBar>
                        </Skills>
                    </div>
                </DsnGrid>

                <BrandClientSwiper className="mt-50" grabCursor/>

            </section>
            {/*<!-- ========== End About Section ========== */}

            {/*<!-- ========== facts-section ==========*/}
            <div className="section-padding p-relative v-dark-head">
                <ParallaxImage alt={""} src={"/img/header.jpg"} overlay={7} asBackground/>
                <div className="container">
                    <Facts className="text-center" col={4} colTablet={2}/>
                </div>
            </div>
            {/*<!-- ========== end facts-section ========== */}


            {/*Start Service*/}
            <div className="container section-margin" data-dsn-title="My Services">
                <TitleSection className="align-items-center text-center" description={"{ Our Services }"}>
                    We are delivering beautiful <br/> digital products for
                    you.
                </TitleSection>
                <ServiceOne/>
            </div>
            {/*End Service*/}


            {/*========== Work Section ========== */}
            <div className="container section-margin" data-dsn-title="My Work">
                <TitleSection description={"{ Our Works }"}>
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
            <div className="container section-margin" data-dsn-title="Testimonials">
                <TitleSection description={"{ testimonials }"}>
                    What People are <br/>Saying
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

            {/*Start Blog*/}
            <div className="section-margin" data-dsn-title="My Blog">
                <TitleSection className={`container  align-items-center text-center`}
                              description={"{ Lasts post }"}>
                    Latest And Greatest <br/>Post
                </TitleSection>
                <BlogSwiper grabCursor
                            desktop={{spaceBetween: 50, slidesPerView: 1.5}}
                            tablet={{spaceBetween: 30, slidesPerView: 1.25}}
                            mobile={{spaceBetween: 0, slidesPerView: 1}}
                            centeredSlides loop
                            blur
                            parallax
                            speed={1200}
                            watchSlidesProgress
                            loopedSlides={2}
                            parallaxImage={{"data-swiper-parallax-scale": "0.85"}}

                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
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