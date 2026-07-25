import {Html, Head, Main, NextScript} from 'next/document';
import Script from 'next/script';

export default function Document() {


    return (
        <Html>
            <Head>
                <link rel="stylesheet"
                      href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Poppins:wght@300;400;500;600;700&display=swap"
                />

                {/* PWA — installable Agent Smith shell */}
                <link rel="manifest" href="/manifest.webmanifest"/>
                <meta name="theme-color" content="#0B0E13"/>
                <meta name="apple-mobile-web-app-capable" content="yes"/>
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
                <meta name="apple-mobile-web-app-title" content="Agent Smith"/>
                <link rel="apple-touch-icon" href="/icons/agent-smith-192.png"/>
            </Head>
            <body>
            <Main/>
            <NextScript/>
            <Script src="/js/splitting.min.js" strategy="beforeInteractive"/>
            <Script src="/js/isotope.min.js" strategy="beforeInteractive"/>
            <Script src="/js/fjGallery.min.js" strategy="beforeInteractive"/>
            <Script id="sw-register" strategy="afterInteractive">
                {`if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function () {
                        navigator.serviceWorker.register('/sw.js').catch(function(){});
                    });
                }`}
            </Script>
            </body>
        </Html>
    )
}
