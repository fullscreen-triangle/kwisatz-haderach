import React, {useRef, useState} from 'react';
import {dsnCN} from "../../hooks/helper";
import TitleSection from "../heading/TitleSection";

function ContactForm({className}) {

    const form = useRef();
    const [loading, setLoading] = useState();
    const [result, setResult] = useState();

    // The message opens in the visitor's own mail program, addressed to Kundai. The theme sent
    // it through an EmailJS account that was never his, so nothing goes to a third party now.
    const sendEmail = (e) => {
        e.preventDefault();
        const f = new FormData(form.current);
        const subject = `Message from ${f.get('name') || 'the website'}`;
        const body = `${f.get('message') || ''}

${f.get('name') || ''} <${f.get('email') || ''}>`;
        window.location.href = `mailto:kundai.sachikonye@uni-greifswald.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setResult(true);
    };

    setTimeout(() => setResult(false), 5000);


    return (

            <div className={dsnCN('form-box', className)}>
                <div className="line line-top" />
                <div className="line line-bottom" />
                <div className="line line-left" />
                <div className="line line-right" />

                <TitleSection description="Stay connected" defaultSpace={false}>
                    Get in Touch
                </TitleSection>
                <p className="mb-30 mt-20">
                    It’s all about the humans behind a brand and those experiencing it,
                    we’re right there. In the middle.
                </p>

                <form  className="form"  ref={form} onSubmit={sendEmail} >
                    <div className="input__wrap controls">
                        <div className="form-group">
                            <div className="entry-box">
                                <label>Your name *</label>
                                <input id="form_name" type="text" name="name"
                                       placeholder="Type your name" required="required"
                                       data-error="name is required." />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="entry-box">
                                <label>Your E-Mail *</label>
                                <input id="form_email" type="email" name="email"
                                       placeholder="Type your Email Address" required="required"
                                       data-error="Valid email is required." />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="entry-box">
                                {/* eslint-disable-next-line react/no-unescaped-entities */}
                                <label>What's up?</label>
                                <textarea id="form_message" className="form-control" name="message" rows={4}
                                          placeholder="Tell us about you and the world"
                                          required="required"
                                          data-error="Please,leave us a message." />
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="image-zoom w-auto d-inline-block" data-dsn="parallax">
                                <button type="submit" className="dsn-button" style={{cursor:"pointer"}}>
                                    <span className="dsn-border border-color-default" />
                                    <span className="text-button">Send Message</span>
                                </button>
                            </div>
                            {loading && <div className="loading-message mt-20">Message Send ...</div>}
                            {result &&
                            <p className="success-message mt-20">Your Message has been successfully sent. I will contact you
                                soon.</p>}
                        </div>
                    </div>
                </form>
            </div>


    );
}

export default ContactForm;