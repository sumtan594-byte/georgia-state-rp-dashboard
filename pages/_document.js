import Document, { Html, Head, Main, NextScript } from 'next/document';

const TRUSTED_TYPES_BOOTSTRAP = `(function(){
  if (!window.trustedTypes) return;
  try {
    window.trustedTypes.createPolicy('default', {
      createScriptURL: function(input) {
        var url = new URL(input, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.indexOf('/_next/static/') === 0) return input;
        throw new TypeError('Blocked untrusted script URL');
      }
    });
  } catch (error) {
    if (error.name !== 'TypeError') throw error;
  }
})();`;

export default class GsrpDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, nonce: ctx.req?.headers['x-nonce'] || null };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="en">
        <Head nonce={nonce || undefined}>
          {nonce ? <script nonce={nonce} dangerouslySetInnerHTML={{ __html: TRUSTED_TYPES_BOOTSTRAP }} /> : null}
          <link rel="icon" href="https://i.imgur.com/whmKhnb.gif" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce || undefined} />
        </body>
      </Html>
    );
  }
}
