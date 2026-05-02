import BoxGallery, {
  BoxGalleryItem,
} from "../../components/box-gallery/BoxGallery";
import ButtonProject from "../../components/button/ButtonProject";
import ParallaxImage from "../../components/Image/ParallaxImage";
import DsnGrid from "../../layout/DsnGrid";
import Layout from "../../layout/Layout";
import NextProject from "../../components/next/NextProject";
import {getPortfolioItem} from "../../data/portfolio";
import HeaderFull from "../../components/header/HeaderFull";
import Image from "next/image";

function Project3(params) {
  const heroData = getPortfolioItem('huggl-power-pack');
  return (
      <Layout>
        <HeaderFull className="dsn-container"
                    alignItems="end"
                    heroContent={heroData} overlay={heroData.overlay}/>

        {/*Start Intro Project*/}
      <section className="intro-project container section-margin">
        <DsnGrid customGrid={{desktop:"40% 60%"}}>
          <div className="intro-project-left">
            <h4 className="title-block text-uppercase mb-20">Project</h4>
            <ul className="intro-project-list">
              <li className="p-relative">
                <strong>Agency</strong>Immersive interactive gallery
              </li>
              <li className="p-relative">
                <strong>creating</strong>Gianni Teruzzi
              </li>
              <li className="p-relative">
                <strong> Published</strong>November 24th 2016
              </li>
            </ul>
          </div>
          <div className="intro-project-right">
            <h4 className="title-block text-uppercase mb-20">info</h4>
            <p className="intro-project-description">
              Huggl is an induction charging, portable power pack that uses
              alternative materials to stimulate new product experiences and
              higher social interactions.
            </p>
            <div className="intro-project-cat mt-30">
              <span className="cat-item"> Arthur Kenzo</span>
              <span className="cat-item"> Smart Speaker </span>
              <span className="cat-item">Voice Speaker </span>
              <span className="cat-item">design</span>
            </div>
            <ButtonProject
              href="https://www.behance.net/gallery/44548047/Huggl-Induction-Power-Pack"
              target="_blank"
              className="mt-30"
            >
              VIST PROJECT
            </ButtonProject>
          </div>
        </DsnGrid>
      </section>
      {/*End Intro Project*/}

      {/*Start Parallax Img*/}
      <ParallaxImage
        alt={""}
        src={"/img/project/project3/2.jpg"}
        overlay={3}
        caption="asdsadsa"
      />
      {/*End Parallax Img*/}

      {/*Start Gallery List*/}
      <BoxGallery className="section-margin container" col={2}>
        <BoxGalleryItem
          src="/img/project/project3/3.jpg"
          groupPopup="gallery"
          caption={"Photography"}
        />
        <BoxGalleryItem
          src="/img/project/project3/4.jpg"
          groupPopup="gallery"
          caption={"Photography"}
        />
      </BoxGallery>
      {/*End Gallery List*/}

      {/*Start Parallax Img*/}
      <ParallaxImage
        alt={""}
        src={"/img/project/project3/5.jpg"}
        caption="asdsadsa"
      />
      {/*End Parallax Img*/}

      {/*Start Intro Project*/}
      <section className="container section-margin text-center">
        <div className="p-relative">
          <h4 className="title-block dsn-text max-w570 ml-auto mr-auto mb-70 sm-mb-30">
            These lights also provide guidance on power pack charge.
          </h4>

          <Image className="w-100" alt={""} src={"/img/project/project3/6.gif"} width={1200} height={700}
               sizes="100vw" />
          <p className="dsn-up mt-30 ml-auto mr-auto max-w570">
            The LEDs are activated by holding the mAh button on the back, next
            to the power button; both of which help avoid accidental power use
            and/or drainage whilst on-the-move.
          </p>
        </div>
      </section>
      {/*End Intro Project*/}

      <NextProject heroContent={getPortfolioItem('principal-garden')} number={2}  />
    </Layout>
  );
}

export default Project3;
