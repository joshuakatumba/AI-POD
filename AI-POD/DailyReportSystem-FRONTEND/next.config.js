const createNextIntlPlugin = require('next-intl/plugin');
const path = require('path');

const nextConfig = {
  allowedDevOrigins: [
    '172.30.224.1'
  ]
};

const withNextIntl = createNextIntlPlugin({
  request: path.resolve(__dirname, './src/i18n/request.ts')
});

module.exports = withNextIntl(nextConfig);