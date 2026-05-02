import BlogItem from './BlogItem';
import {getBlogData} from "../../data/blog";
import {dsnCN} from "../../hooks/helper";
import {MetaData} from "../../hooks/EremiaType";
import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";


export interface BlogProps extends DsnGridProps {
    className?: string,
    hideMetaData?: MetaData,
    styleBlog?: "" | "our-blog-classic our-blog-full-img" | "our-blog-classic"

}


function BlogSwiper({className, hideMetaData, styleBlog, ...restProps}: BlogProps) {
    const dataPortfolio = getBlogData();

    return (
        <DsnGrid className={dsnCN("our-blog", className, styleBlog)} {...restProps}>
            {
                dataPortfolio.map((item, index) => <BlogItem key={index} portoDetails={item} textButton="Load More"
                                                             metaData={hideMetaData}/>)
            }
        </DsnGrid>

    );
}


export default BlogSwiper