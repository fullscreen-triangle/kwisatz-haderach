import React from 'react'
import DsnGrid from "../../layout/DsnGrid";
import ParallaxImage from "../Image/ParallaxImage";
import TitleSection from "../heading/TitleSection";
import Button from "../button/Button";
import ButtonPopup from "../button-popup/ButtonPopup";


const heroData = {
    title: `We help to create visual strategies`,
    descTitle: `capabilities our company`,
    subtitle: `The Best Choice For Your Successful Business!`,
    description: `We always stay with our clients and respect their business. We deliver 100% and provide instant response.`,
    descriptionTow: `Our clients describe us as a product team which
                        creates amazing UI/UX experiences, by crafting top-notch user
                        experience.`,
    heroImage: '/img/about-intro.jpg',
    link: {
        href: "/services"
    },
    textButton: `View More <span>⟶</span>`,
    img: {src: "/img/help-project.jpg", alt: ""},
    video: {
        href: "https://www.youtube.com/watch?v=mRvqcvqB4EI",
        textBefore: "Play",
        textAfter: "Video",

    }
};


function HeroSectionThree({className, ...restProps}) {


    return (
        <DsnGrid className="video-section p-relative" col={2} colTablet={1} rowGap={0} {...restProps}>

            <div className="video-inner p-relative h-100 v-dark-head">
                <ParallaxImage {...heroData.img} height={"100%"} overlay={2} sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"/>
                <ButtonPopup className={"v-middle"} {...heroData.video} />
            </div>
            <div className="box-info mt-50 mb-50">
                <div className="box-info-inner w-100">
                    <TitleSection description={heroData.descTitle} defaultSpace={false}>
                        <span dangerouslySetInnerHTML={{__html: heroData.title}}/>
                    </TitleSection>

                    <p className="pb-30 mb-30 mt-30 border-bottom theme-color">{heroData.subtitle}</p>
                    <p className="max-w570 dsn-up mb-10">{heroData.description}</p>
                    <p className="max-w570 dsn-up">{heroData.descriptionTow}</p>
                    <div className="border-bottom mt-30 mb-30"/>
                    <Button {...heroData.link} borderRadius>
                        <span dangerouslySetInnerHTML={{__html: heroData.textButton}}/>
                    </Button>
                </div>
            </div>

        </DsnGrid>
    )
}


export default HeroSectionThree;