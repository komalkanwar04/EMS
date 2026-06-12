const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy any request starting with /api to the backend server
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      // You can enable log level for debugging
      // logLevel: 'debug',
    })
  );
  // Proxy any request starting with /uploads to the backend server
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );
};
