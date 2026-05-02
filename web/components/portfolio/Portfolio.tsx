import  {useRef, useState, useEffect} from 'react';
import PortfolioItem from './PortfolioItem';
import {getPortfolioData} from "../../data/portfolio";


import {dsnCN} from "../../hooks/helper";
import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
import {styleBox, stylePortfolio} from "../../hooks/EremiaType";
import FilterPortfolio from "./FilterPortfolio";


interface PortfolioProps extends DsnGridProps {
    stylePortfolio?: stylePortfolio,
    styleBox?: styleBox,
    useFilter?: boolean,
    filterClass?: string,


}


function Portfolio({className, filterClass, useFilter, stylePortfolio, styleBox, ...restProps}: PortfolioProps) {
    const dataPortfolio = getPortfolioData();
    const iso = useRef(null);
    const [filter, setFilter] = useState('*');
    const refIsotope = useRef();

    // @ts-ignore
    const category = new Set();
    dataPortfolio.map((p) => {
        return typeof p.category === "object" ? p.category.map(i => category.add(i)) : category.add(p.category)
    });

    useEffect(() => {
        if (!useFilter)
            return;
        // @ts-ignore
        const Isotope = require("isotope-layout/js/isotope");
        iso.current = new Isotope(refIsotope.current, {itemSelector: '.portfolio-item'});

        return () => {
            iso.current.destroy();
        }
    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!useFilter)
            return;
        iso.current.arrange({filter: filter});
    }, [filter]);// eslint-disable-line react-hooks/exhaustive-deps

    return (

        <section className={dsnCN("work",className, stylePortfolio, styleBox && `with-lc`)}>
            {useFilter &&
            <FilterPortfolio className={filterClass} categories={[...category]} actionFilter={setFilter}/>}
            <DsnGrid  {...restProps}className={useFilter && "dsn-grid-masonry"} ref={refIsotope}>
                {
                    dataPortfolio.map(
                        (item, index) =>
                            <PortfolioItem
                                // @ts-ignore
                                className={typeof item.category === "object" ? item.category.join(" ").toLowerCase() : item.category.toLowerCase()}
                                key={index} portoDetails={item} textButton="View Case"
                                styleBox={styleBox}/>
                    )
                }
            </DsnGrid>
        </section>
    )
}


export default Portfolio;