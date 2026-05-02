import React from "react";
import Layout from "../layout/Layout";
import TitleSection from "../components/heading/TitleSection";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import SwiperPagination from "../components/swiper-pagination/SwiperPagination";
import HeaderFull from "../components/header/HeaderFull";
import Button from "../components/button/Button";
import {getServiceData} from "../data/service";
import ServiceSwiper from "../components/services/ServiceSwiper";
import DsnGrid from "../layout/DsnGrid";
import List, {ListItem} from "../components/list/List";
import {faCheck} from "@fortawesome/free-solid-svg-icons";
import ParallaxImage from "../components/Image/ParallaxImage";
import Accordion, {AccordionItem} from "../components/accordion/Accordion";
import Image from "next/image";
import Skills, {SkillProgressBar} from "../components/skill/Skills";
import BgDot from "../components/header/BgDot";
import Facts from "../components/facts/Facts";
import BlogSwiper from "../components/bolg/BlogSwiper";
import Testimonial from "../components/testimonial/Testimonial";
import BrandClient from "../components/brand-client/BrandClient";
import ModalContact from "../components/model-right/ModalContact";
import NextPage from "../components/next/NextPage";
import Footer from "../components/footer/Footer";
import Head from "next/head";


const headerData = {
    title: `Crafting Digital <br/> Experiences`.toUpperCase(),
    subtitle: `<span class="heading-color line-shape line-shape-before">We are a design & development agency</span>`,
    src: "/img/header.jpg"
}


function Demo2() {


    TitleSection.defaultProps = {
        className: "align-items-start",
        classDesc: "line-shape line-shape-after text-uppercase",
        classDesInner: "line-bg-left",
        dirDescription: "after",
        classTitle: "text-uppercase"
    }


    return (
        <Layout  modelRight={{children:<ModalContact />,propsModal:{textBtn:"Contact"}}}>
            <Head>
                <title>Creative Agency  | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>
            <HeaderFull className="dsn-container" heroContent={headerData} overlay={5} fullWidth >
                <p className="mt-20 max-w570">
                    Miena sipu del inora aid consectetur adipiscing elit.
                    Ut elit tellus, luctus nec ullamcorper mattis nutka ,
                    pulvinar dapibus leo della pierrano set amuse.
                </p>
                <Button href={"/services"} className="background-theme mt-20" borderStyle={false} borderRadius>
                    Our Services
                </Button>
            </HeaderFull>

            {/*<!-- ========== Service Section ========== */}
            <div className="dsn-container section-margin dsn-under-header dsn-offset">
                <ServiceSwiper
                    desktop={{spaceBetween: 15, slidesPerView: 2.2}}
                    autoplay
                    backgroundColor={"background-section"}
                    grabCursor
                    loop
                    loopedSlides={2}
                    speed={1000}
                    data={getServiceData()}
                >
                    <SwiperPagination className={"mt-30 dsn-container justify-content-between"}/>
                </ServiceSwiper>
            </div>
            {/*<!-- ========== End Service Section ========== */}

            {/*<!-- ========== About Section ========== */}
            <div className="container section-margin" data-dsn-title="About Us">
                <p className="sub-heading line-bg-left mb-15 text-uppercase">What We Do</p>
                <DsnGrid col={2}>
                    <div className="box-left">
                        <h4> Keep Your Business Safe & Ensure High Availability </h4>
                    </div>
                    <div className="box-right">
                        <p className="max-w570 dsn-up mb-15 ">
                            A business consulting agency is involved in
                            the planning, implementation, and education of
                            businesses. We work directly
                            with business owners on developing a business
                            plan, identifying marketing
                            needs and developing the necessary skills for
                            business ownership.</p>

                        <p className="max-w570 dsn-up">
                            but deploy to production. C-suite. First-order optimal
                            strategies build on a culture of contribution and inclusion so those
                            options
                        </p>
                    </div>
                </DsnGrid>
                <List className="pt-50 mt-50 border-top mt-md-30 pt-md-30" col={3} iconSize="20px">
                    <List.item icon={<FontAwesomeIcon icon={faCheck} className="theme-color"/>}
                               className="align-items-center" >
                        Advanced Grid
                    </List.item>
                    <List.item icon={<FontAwesomeIcon icon={faCheck} className="theme-color"/>}
                               className="align-items-center">
                        Top Performance
                    </List.item>
                    <List.item icon={<FontAwesomeIcon icon={faCheck} className="theme-color"/>}
                               className="align-items-center">
                        Responsive Design
                    </List.item>
                </List>
            </div>
            {/*<!-- ========== End About Section ========== */}

            {/*<!-- ========== box-gallery-vertical image left ========== */}
            <DsnGrid className="p-relative mt-section over-hidden" col={2} colTablet={1} colGap={0} rowGap={0} data-dsn-title="Feature">
                <div className="box-img" >
                    <ParallaxImage alt="" src={"/img/rachel-claire.jpg"} height="100%"/>
                </div>
                <div className="box-info box-padding background-section" >
                    <TitleSection className={"mb-50"} defaultSpace={false} description="Some Feature">
                        We combine design and thinking and technical craft.
                    </TitleSection>
                    <p className="max-w570 dsn-up mb-10 ">When our team provides design and digital
                        marketing. Applied arts can include industrial
                        design, graphic design,</p>

                    <p className="max-w570 dsn-up"> fashion design, and the decorative arts which
                        traditionally includes craft objects.</p>

                    <div className="border-bottom mt-30 mb-30"/>
                    <List className="pb-30 border-bottom" col={1} rowGap={30}>
                        <ListItem number="1" headingTag="span" headingTitle="sm-title-block">
                            Next level Business consulting services
                        </ListItem>
                        <ListItem number="2" headingTag="span" headingTitle="sm-title-block">
                            Marketing strategies & Digital marketing
                        </ListItem>
                        <ListItem number="3" headingTag="span" headingTitle="sm-title-block">
                            Management & Strong Strategies
                        </ListItem>
                    </List>
                    <Button href={"/services"} className="background-theme mt-30" borderStyle={false} borderRadius>
                        View More <span className="icon">⟶</span>
                    </Button>
                </div>
            </DsnGrid>
            {/*<!-- ========== End box-gallery-vertical image left ========== */}

            {/*<!-- ========== box-gallery-vertical image right ========== */}
            <DsnGrid className="p-relative mb-section over-hidden" col={2} colTablet={1} colGap={0} rowGap={0}>
                <div className="box-info box-padding background-section order-md-2">
                    <TitleSection className={"mb-50"} defaultSpace={false} description="Some Feature">
                        Financing solutions .
                    </TitleSection>

                    <p className="max-w570 dsn-up">A business consulting
                        agency is involved in the planning, implementation,
                        and education of
                        businesses. We work directly with business owners on
                        developing a
                        business plan, identifying marketing needs and
                        developing the necessary
                        skills for business ownership.</p>

                    <div className="border-bottom mt-30 mb-30"/>
                    <Accordion className={"pb-30 border-bottom"}>
                        <AccordionItem title="Website & Mobile App Design" active number={1}>
                            <p>
                                We’ve created a full-stack structure for our working
                                workflow processes, were from the funny the century initial all the made, have spare to
                                negatives.
                            </p>
                        </AccordionItem>
                        <AccordionItem title="User Experience" number={2}>
                            <p>
                                We’ve created a full-stack structure for our working
                                workflow processes, were from the funny the century initial all the made, have spare to
                                negatives.
                            </p>
                        </AccordionItem>

                    </Accordion>
                    <Button href={"/services"} className="background-theme mt-30" borderStyle={false} borderRadius>
                        View More <span className="icon">⟶</span>
                    </Button>
                </div>
                <div className="box-img order-md-1">
                    <ParallaxImage alt="" src={"/img/project/project2/4.jpg"} height="100%"/>
                </div>

            </DsnGrid>
            {/*<!-- ========== End box-gallery-vertical image Right ========== */}
            <section className="about-section-2 section-margin">
                <div className="container">
                    <DsnGrid col={2} colTablet={1}>
                        <div className="box-img p-relative">

                            <div className="box-inner-img p-absolute">
                                <Image className={"cover-bg-img"} src="/img/help-project.jpg" alt="" fill/>
                            </div>
                            <div className="box-inner-img p-absolute">
                                <Image className={"cover-bg-img"} src="/img/help2.jpg" alt="" fill/>
                            </div>

                        </div>
                        <div className="box-information">
                            <TitleSection className="align-items-start mb-50" description="CAPABILITIES"
                                          defaultSpace={false}>
                                We help to create visual strategies.
                            </TitleSection>
                            <p className="mb-30">
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Sed obcaecati autem
                                distinctio veritatis excepturi, fugit iste repellendus, porro delectus rem
                                ducimus cum fugiat, magnam voluptates cumque? Consequatur eos debitis sit?
                            </p>
                            <Skills>
                                <SkillProgressBar number={85}>Web Design</SkillProgressBar>
                                <SkillProgressBar number={72}>SEO, analytics & marketing</SkillProgressBar>
                                <SkillProgressBar number={89}>Mobile Development</SkillProgressBar>
                            </Skills>

                        </div>

                    </DsnGrid>
                </div>
            </section>

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
            <div className="container section-margin" data-dsn-title="Our Blog">
                <TitleSection description={"Lasts post"}>
                    Latest And Greatest <br/>Post
                </TitleSection>
                <BlogSwiper className={"our-blog-classic"}
                            grabCursor
                            desktop={{spaceBetween: 15, slidesPerView: 3}}
                            mobile={{spaceBetween: 0, slidesPerView: 1}}
                            loop
                            speed={800}
                            watchSlidesProgress
                            loopedSlides={2}
                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
                </BlogSwiper>
            </div>
            {/*End Blog*/}

            {/*Start testimonial Section*/}
            <div className="section-margin" data-dsn-title="testimonials">

                <Testimonial className="container" title="Feedback from our clients."
                             skin={["testimonials-half"]}
                             desktop={{slidesPerView: 2}}
                             backgroundColor={"background-section"}
                             speed={1000} grabCursor loop loopedSlides={2}
                             parallax parallaxImage={{"data-swiper-parallax-scale": 0.7}}
                             parallaxContent={{"data-swiper-parallax-opacity": 0, "data-swiper-parallax": "30%"}}
                >
                    <SwiperPagination className={`justify-content-between dsn-container mt-30`}/>
                </Testimonial>
            </div>

            {/*End testimonial Section*/}

            {/*========== End brand-client Section ==========*/}
            <section className="container section-margin" data-dsn-title="our clients">
                <TitleSection className={`align-items-center text-center`}
                              description={"Our clients"}>
                    Your successful, our <br/>reputation
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

export default Demo2;



