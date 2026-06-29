const createNextIntlPlugin = require('next-intl/plugin');
const path = require('path');

const nextConfig = {
  /* your config options here */
};

const withNextIntl = createNextIntlPlugin({
  request: path.resolve(__dirname, './src/i18n/request.ts')
});

module.exports = withNextIntl(nextConfig);