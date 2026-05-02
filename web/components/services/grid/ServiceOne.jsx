import React from 'react'

import Service from "../Service";
import {getServiceData} from "../../../data/service";


const ServiceOne  = ({className}) => {
    return (
        <Service.grid col={3} colTablet={2} colMobile={1}  colGap={15} masonry
             className={className} data={getServiceData()} backgroundColor={"background-section"} styleBox={"line"}
        />
    );
};


export default ServiceOne