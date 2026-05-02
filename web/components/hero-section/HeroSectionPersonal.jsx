import React from 'react'
import DsnGrid from "../../layout/DsnGrid";
import ParallaxImage from "../Image/ParallaxImage";
import TitleSection from "../heading/TitleSection";
import Button from "../button/Button";


const heroData = {
    title: `Why hire me for your next project`,
    descTitle: `About Me`,
    subtitle: `Proin laoreet elementum ligula`,
    description: `Proin volutpat mauris ac pellentesque pharetra. Suspendisse
                    congue elit vel odio suscipit, sit amet tempor nisl imperdiet. Quisque ex
                    justo`,
    heroImage: '/img/about-me.jpg',
    infoPersonal: [
        {key: "Age", value: "29"},
        {key: "Residence", value: "Egypt"},
        {key: "Address", value: "27 Some Street, Some Town"},
        {
            key: "E-Mail",
            value: "info@dsngrid.com",
            link: {href: "mailto:info@dsngrid.com", target: "_blank", rel: "nofollow"}
        },
    ],

    firstLink: {text: "DOWNLOAD CV", option: {href: "#0", target: "_blank", rel: "nofollow"}},
    lastLink: {text: "LEARN MORE", option: {href: "/services"}},
};


function HeroSection({className, ...restProps}) {


    return (
        <DsnGrid col={2} colTablet={1} colGap={0} rowGap={0} rowGapTablet={60}>
            <div className="box-img background-section p-20 p-relative">
                <div className="line line-top"/>
                <div className="line line-bottom"/>
                <div className="line line-left"/>
                <div className="line line-right"/>
                <ParallaxImage alt={""} src={heroData.heroImage} overlay={4} height={"100%"}/>
            </div>
            <div className="box-info box-padding p-md-0 ">
                <TitleSection className="mb-30" description={heroData.descTitle}
                              defaultSpace={false}>{heroData.title}</TitleSection>
                <h5 className="sm-title-block theme-color">{heroData.subtitle}</h5>
                <div className="border-bottom mt-20 mb-20"/>
                <p className="max-w570">{heroData.description}</p>
                <DsnGrid as="ul" className="mt-20 pt-20 pb-20 border-bottom border-top" col={2}>
                    {
                        heroData.infoPersonal && heroData.infoPersonal.map(
                            (item, index) =>
                                <li key={index}>
                                    <strong className="heading-color mr-5">{item.key} : </strong>
                                    {item.link ? <a {...item.link}>{item.value}</a> : item.value}
                                </li>
                        )
                    }

                </DsnGrid>

                <div className="d-flex align-items-center mt-30">
                    {heroData.firstLink && <Button {...heroData.firstLink.option} className="mr-15 line-head"
                                                   borderStyle={"border-color-theme-color"}
                                                   borderRadius>{heroData.firstLink.text}</Button>}

                    {heroData.lastLink && <Button {...heroData.lastLink.option} className="line-head"
                                                  borderRadius>{heroData.lastLink.text}</Button>}
                </div>

            </div>

        </DsnGrid>
    )
}


export default HeroSection;