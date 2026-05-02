import React from 'react';
import {dsnCN} from "../../hooks/helper";
import DsnGrid from "../../layout/DsnGrid";


function CommentForm({className}) {


    return (
        <div className={dsnCN("comments-form comments-post mb-section", className)}>
            <div id="respond" className="comment-respond">
                <h4 className="comments-title p-relative title-block ">
                    <span className="line-bg-right">
                    Leave A Comment
                    </span>

                </h4>
                <form className="dsn_root_form dsn-form-comment">
                    <DsnGrid col={2} colTablet={1} className="mb-30">
                        <div className="entry-form p-relative">
                            <input name="author" type="text" placeholder="Type your name" value=""
                                   maxLength="245" required=""/>
                        </div>
                        <div className="entry-form p-relative">
                            <input name="email" type="email" placeholder="Type your Email Address" value=""
                                maxLength="245" required=""/>
                        </div>
                    </DsnGrid>

                    <div className="entry-form p-relative mb-30">
                        <textarea id="comment" name="comment" rows="6" placeholder="Comment" required="required"/>
                    </div>

                    <div className="submit-div image-zoom">
                        <input name="submit" type="submit" className="dsn-button-comment submit-form " value="Post Comment"/>
                    </div>
                </form>
            </div>

        </div>
    );
}

export default CommentForm;