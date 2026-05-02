import React from 'react'

import DsnGrid from "../../layout/DsnGrid";
import ParallaxImage from "../Image/ParallaxImage";
import {dsnCN} from "../../hooks/helper";

import TitleSection from "../heading/TitleSection";
import TitleCover from "../heading/TitleCover";


const heroData = {
    titleCover: `Eremia`,
    title: `Angelo Walking`,
    descTitle: `Project Manager`,
    subtitle: `Creative Web & App Developer`,
    description: `To avoid your boss’s staring eye, you should not roll your eyes to check
                            the time. The Time Tag Watch is a consummately appropriate for it.`,
    descriptionTow: `Those tags do the role of the hands of the watch. By rotating the face
                            of the watch not the hands, it gets harder to be damaged. It provides
                            you with experience to feel the time at the end of your finger without
                            damaging your watch.`,
    link: {
        href: "/services"
    },
    textButton: `View More <span>⟶</span>`,
    img: {src: "/img/project-manager.jpeg", alt: ""},
    social: {
        title: `Social <br/>Media`,
        links: [{url: "#0", title: "FB"}, {url: "#0", title: "TW"}, {url: "#0", title: "LN"},]
    }

};


function HeroSectionFour({className}) {


    return (
        <DsnGrid className={dsnCN("box-gallery-vertical box-gallery-content", className)} col={2} colTablet={1} colGap={0} rowGap={0}>
            <div className="p-relative box-content order-md-2">
                <div className="box-info h-100 box-padding background-section ">
                    <div className="box-info-inner">
                        <TitleCover>{heroData.titleCover}</TitleCover>
                        <TitleSection description={heroData.descTitle} defaultSpace={false}>
                            <span dangerouslySetInnerHTML={{__html: heroData.title}}/>
                        </TitleSection>
                        <h6 className="pb-30 mb-30 mt-30 border-bottom sm-title-block theme-color">
                            {heroData.subtitle}
                        </h6>
                        <p className="max-w570 dsn-up mb-10 ">{heroData.description}</p>
                        <p className="max-w570 dsn-up">{heroData.descriptionTow}</p>

                        <div className="border-bottom mt-30 mb-30"/>

                        <div className="d-flex  a-item-center">
                            <p className="sub-heading" dangerouslySetInnerHTML={{__html: heroData.social.title}}/>

                            <ul className="box-social ml-20">
                                {
                                    heroData.social.links.map(($item, $index) =>
                                        <li data-dsn="parallax" key={$index}><a href={$item.url} target="_blank"
                                                                                rel="nofollow">{$item.title}</a></li>)
                                }
                            </ul>
                        </div>


                    </div>
                </div>
            </div>
            <div className="p-relative box-img order-md-1">
                <ParallaxImage {...heroData.img} fill height={"100%"} heightTable="70vh" sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"/>
            </div>
        </DsnGrid>
    )
}


export default HeroSectionFour;