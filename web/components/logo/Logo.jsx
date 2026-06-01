import React from "react";
import styled from "styled-components";

const MainBrand = styled.div`
  img {
    width: ${props => props.width};
    max-width: 100%;
    height: ${props => props.height};
    display: block;
  }
  .v-light &, & {
    img { filter: none; }
  }
  .v-dark & {
    img { filter: invert(1) brightness(1.1); }
  }
`;

const Logo = ({width, height, alt}) => (
  <MainBrand className="main-brand" width={width} height={height}>
    <img src="/final_logo.svg" alt={alt} />
  </MainBrand>
);

MainBrand.defaultProps = { width: '80px', height: 'auto' };
Logo.defaultProps = { alt: "Fullscreen Triangle" };

export default React.memo(Logo);
