import styled from "styled-components";
import {dsnCN} from "../../hooks/helper";


function MetaPost({date = false, className = null, category, separate = null}) {
    return (
        <Meta className={dsnCN("post-info", className)}>
            {date && <span className="post-date">{date} </span>}
            {category && <div className="metas">
                {typeof category === "object" ? category.map((cat, index) => <span key={index}
                                                                                   data-separate={separate}>{cat}</span>) :
                    <span>{category}</span>}
            </div>}
        </Meta>
    )
}


export const Meta = styled.span`
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1.2px;
  word-spacing: 2px;

  span {
    margin-bottom: 8px;
  }

  .post-date, .post-cat {
    display: inline-block
  }

  .post-date {
    padding-right: 20px;
  }

  .post-cat span {

    &:not(:first-child):before {
      content: attr(data-separate);
    }
  }

`;


export default MetaPost;
