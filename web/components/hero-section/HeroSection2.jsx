import React from 'react'
import DsnGrid from "../../layout/DsnGrid";
import {dsnCN} from "../../hooks/helper";
import Image from "next/image";
import TitleSection from "../heading/TitleSection";
import Button from "../button/Button";


const heroData = {
    title: `WE ARE , <br/> DSIGN GRID`,
    descTitle: `ABOUT DIGITAL AGENCY`,
    subtitle: `We’re a creative agency with an expertise in make custom websites.`,
    description: `Founded in 2000, Dsn Grid has become one of the best Digital Agency in
                            ThemeForest. Blue money going forward, but deploy to production. First-order
                            optimal strategies build on a culture of contribution and inclusion so those
                            options`,
    heroImage: '/img/about-intro.jpg',
    link: {
        href: "/about"
    },
    textButton: "About Us",
    firstImage : {src:"/img/help-project.jpg" ,alt:"" , fill:true},
    lastImage : {src:"/img/help2.jpg" ,alt:"" , fill:true},
};


function HeroSection({className, ...restProps}) {


    return (
        <section className={dsnCN("about-section-2", className)} {...restProps}>
            <div className="container">
                <DsnGrid col={2} colTablet={1}>
                    <div className="box-img p-relative">

                        <div className="box-inner-img p-absolute">
                            <Image className={"cover-bg-img"} {...heroData.firstImage} alt="" fill={false} width={750} height={915}/>
                        </div>
                        <div className="box-inner-img p-absolute">
                            <Image className={"cover-bg-img"} {...heroData.lastImage} alt="" fill={false} width={750} height={915}/>
                        </div>

                    </div>
                    <div className="box-information">
                        <TitleSection className="align-items-start mb-30" description={heroData.descTitle}
                                      defaultSpace={false}>
                            <span dangerouslySetInnerHTML={{__html: heroData.title}}/>
                        </TitleSection>
                        <h5 className="sm-title-block mb-10" dangerouslySetInnerHTML={{__html: heroData.subtitle}}/>
                        <p dangerouslySetInnerHTML={{__html: heroData.description}}/>
                        <Button className={"mt-30"} {...heroData.link}>{heroData.textButton}</Button>

                    </div>

                </DsnGrid>
            </div>

        </section>
    )
}


export default HeroSection;