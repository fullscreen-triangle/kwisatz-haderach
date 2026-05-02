import React from "react";
import styled from "styled-components";
import brandLight from './logo.png';
import brandDark from './logo-dark.png';
import Image from "next/image";

const MainBrand = styled.div`
   img{
    width : ${props => props.width};
    max-width: 100%;
    height: ${props => props.height};
   }
   .v-light & , & {
        .logo-dark{
           display : block ;     
        }
        .logo-light{
            display : none;    
        }
   }
    
   .v-dark & {
       .logo-dark{
           display : none ;     
        }
        .logo-light{
            display : block;    
        }
   }
   
`;

const Logo = ({width, height, alt}) => {



    return (
        <MainBrand className="main-brand" width={width} height={height}>
            <Image className="logo-light" src={brandLight?.src} alt={`${alt} - logo light`} width={320} height={84}/>
            <Image className="logo-dark" src={brandDark?.src} alt={`${alt} - logo dark`} width={320} height={84}/>
        </MainBrand>
    );
}

MainBrand.defaultProps = {width: '80px', height: 'auto'}
Logo.defaultProps = {alt: "Eremia"}

export default React.memo(Logo);