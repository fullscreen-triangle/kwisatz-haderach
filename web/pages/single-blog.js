import Layout from "../layout/Layout";
import TitleSection from "../components/heading/TitleSection";
import ParallaxImage from "../components/Image/ParallaxImage";

import Footer from "../components/footer/Footer";
import ModalContact from "../components/model-right/ModalContact";
import HeaderNormal from "../components/header/HeaderNormal";

import MetaPost from "../components/meta/MetaPost";
import ButtonPopup from "../components/button-popup/ButtonPopup";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from "react";
import {faThLarge} from "@fortawesome/free-solid-svg-icons";
import CommentForm from "../components/bolg/CommentForm";
import Link from "next/link";
import Head from "next/head";

function Home() {
    TitleSection.defaultProps = {
        classDesc: "line-shape line-shape-before",
        classDesInner: "line-bg-right",
    };


    return (
        <Layout modelRight={{children: <ModalContact/>, propsModal: {textBtn: "Contact"}}}>
            <Head>
                <title>Single Blog  | Eremia Creative Portfolio Multi-Purpose</title>
            </Head>

            {/*========== Header Normal ========== */}
            <HeaderNormal container={"container"}>
                <MetaPost category={['Lifestyle']}/>
                <h1 className="title text-uppercase">
                    Create the best <br /> workplace
                </h1>
            </HeaderNormal>
            {/*========== End Header Normal ==========*/}

            {/*Start Parallax Img*/}
            <ParallaxImage alt={""} src={"/img/blog/4.jpg"} height={"80vh"}
                           parallaxFrom={{scale: 1.3}} parallax={{scale: 1}}
                           overlay={5}/>
            {/*End Parallax Img*/}

            <div className="news-content mb-section mt-40">
                <div className="single-post container post-content  ">

                    <h3>Wildlife could be amazing, see why.</h3>
                    <p>Mauris ut augue ac ligula commodo pretium. Cras aliquet nec purus et imperdiet. Donec tempor
                        tellus ut tortor finibus, ut convallis elit eleifend. Etiam aliquet molestie lobortis. Morbi
                        tempor auctor semper. Maecenas cursus maximus erat, tincidunt venenatis odio molestie tempor.
                        Fusce sagittis leo porta dolor auctor viverra eu a ante. Suspendisse tristique nulla quis augue
                        suscipit facilisis. Proin tincidunt, sapien sit amet malesuada scelerisque, metus dolor
                        ultricies quam, vitae lobortis mauris eros non enim. Aliquam et quam eget mauris lacinia
                        aliquam. Fusce vitae massa sed nisl ultrices imperdiet. Integer vehicula sapien eros, in
                        bibendum sem pretium vitae. Nulla tempor dapibus elit, nec tempus tortor commodo sagittis.
                        Interdum et malesuada fames ac ante ipsum primis in faucibus.</p>

                    <blockquote className="block-quote">
                        <p>On her way she met a copy. The copy
                            warned the Little Blind Text, that where it came from it would have been rewritten a
                            thousand
                            times and everything that was left from its origin would be the word “and” and the Little
                            Blind
                            Text should turn around and return to its own, safe country.</p>
                    </blockquote>
                    {/*Start Box Info Center Content*/}
                    <div className="p-relative v-dark-head text-center">
                        <ParallaxImage src="/img/blog/2.jpg" overlay={4} height={"80vh"} alt={""}/>
                        <div className="v-middle z-index-1">
                            <ButtonPopup href="//media.w3.org/2010/05/sintel/trailer.mp4"/>
                        </div>
                    </div>
                    {/*End Box Info Center Content*/}

                    <h3>Illum ad nostrum et inventore illo dolorem</h3>
                    <p>Nunc finibus blandit interdum. Pellentesque nec dapibus mauris, a placerat risus. Nullam pretium
                        neque in justo rutrum, eu lacinia nibh placerat. Sed et magna metus. Sed ut lacus tincidunt nisi
                        volutpat luctus. Integer eget nulla vitae nisl convallis cursus. Vivamus vel finibus purus. Duis
                        pulvinar, dui nec dignissim semper, nibh elit finibus leo, quis feugiat arcu urna ut felis. Cras
                        est risus, dapibus sed arcu at, porta blandit felis. Quisque maximus ante vel risus tristique
                        aliquet. Mauris facilisis nisi nec ipsum feugiat pharetra. Cum sociis natoque penatibus et
                        magnis dis parturient montes, nascetur ridiculus mus. Praesent aliquam augue diam, a lacinia est
                        ornare ut. In mauris elit, elementum porttitor placerat a, ornare in elit. Praesent id tortor
                        arcu.</p>


                    {/*<CommentForm className="mt-section"/>*/}

                    <div className="post-tags p-relative heading-color font-heading">
                        <a href="#0" title="View All Posts in Tag " rel="tag">
                            <span className="post_tag post_tag">Creative</span>
                        </a>
                        <a href="#0" title="View All Posts in Tag " rel="tag">
                            <span className="post_tag post_tag">Design</span>
                        </a>
                    </div>
                </div>


            </div>
            <div className="pagination-post d-flex align-items-center border-style border-radius section-margin container background-section">

                <div className="pagination-item w-100 p-20">
                    <Link href="single-blog">
                        <span className="mb-5">PREVIOUS</span>
                        <h4 className="title-block word-wrap">Why a public figure</h4>
                    </Link>
                </div>

                <div className="icon p-20 border-right border-left">
                    <a className="h-100 heading-color" href="#">
                        <FontAwesomeIcon icon={faThLarge}/>
                    </a>
                </div>
                <div className="pagination-item w-100 p-20 text-right">
                    <Link href="single-blog" >
                        <span className="mb-5">NEXT</span>
                        <h4 className="title-block word-wrap">Newly-launched campaign</h4>
                    </Link>
                </div>
            </div>

            <CommentForm className="container"/>


            {/*========== Footer ==========*/}
            <Footer className="background-section"/>
            {/*========== End Footer ==========*/}
        </Layout>
    );
}

export default Home;
