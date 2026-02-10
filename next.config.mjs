/** @type {import('next').NextConfig} */


const configuratorHost = process.env.CONFIGURATOR_HOST || "192.168.30.92";
const configuratorDevPort = process.env.CONFIGURATOR_DEV_PORT || "7007";
const configuratorProdPort = process.env.CONFIGURATOR_PORT || "7007";



const configuratorPort =
  process.env.NODE_ENV === "development"
    ? configuratorDevPort
    : configuratorProdPort;
const configuratorOrigin = `http://${configuratorHost}:${configuratorPort}`;


// 3D converter service (Docker container exposed on host port 3005)
const converterHost = process.env.CONVERTER_HOST || "localhost";
const converterPort = process.env.CONVERTER_PORT || "7009";
const converterOrigin = `http://${converterHost}:${converterPort}`;




// Tecnibo Flask app (proxied through Next on port 3009)
const tecniboHost = process.env.TECNIBO_HOST || "192.168.30.92";
const tecniboPort = process.env.TECNIBO_PORT || "5000";
const tecniboOrigin = `http://${tecniboHost}:${tecniboPort}`;






const nextConfig = {
  async rewrites() {
    return [
      // Converter assets/API when requested from the converter page (avoids 404s)
      {
        source: "/assets/:path*",
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*digitalfactory/3dconverter.*",
          },
        ],
        destination: `${converterOrigin}/assets/:path*`,
      },
      {
        source: "/api/:path*",
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*digitalfactory/3dconverter.*",
          },
        ],
        destination: `${converterOrigin}/api/:path*`,
      },
      {
        source: "/v2/configurator/:path*",
        destination: `${configuratorOrigin}/v2/configurator/:path*`,
      },
      // 3D converter app running in Docker (host port 3005)
      {
        source: "/digitalfactory/3dconverter/:path*",
        destination: `${converterOrigin}/:path*`,
      },
      {
        source: "/digitalfactory/3dconverter",
        destination: `${converterOrigin}/`,
      },
      // Canonical route for Process & Tools department Flask app
      {
        source: "/tools/fiches/:path*",
        destination: `${tecniboOrigin}/:path*`,
      },
      {
        source: "/tools/fiches",
        destination: `${tecniboOrigin}/`,
      },
      // API endpoints of the Tecnibo Flask app
      {
        source: "/get_fiche/:path*",
        destination: `${tecniboOrigin}/get_fiche/:path*`,
      },
      // Static and upload assets served by the Flask app
      {
        source: "/static/:path*",
        destination: `${tecniboOrigin}/static/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${tecniboOrigin}/uploads/:path*`,
      },
      // Form/API endpoints (no prefix when posted from rendered HTML)
      { source: "/add_fiche", destination: `${tecniboOrigin}/add_fiche` },
      { source: "/update_fiche", destination: `${tecniboOrigin}/update_fiche` },
      { source: "/delete_fiche", destination: `${tecniboOrigin}/delete_fiche` },
      { source: "/create_exploded_view", destination: `${tecniboOrigin}/create_exploded_view` },
      { source: "/save_annotations", destination: `${tecniboOrigin}/save_annotations` },
      { source: "/index", destination: `${tecniboOrigin}/index` },
    ];
  },
  async redirects() {
    return [
      {
        source: "/tools",
        destination: "/tools/fiches",
        permanent: true,
      },
    ];
  },
};



export default nextConfig;
