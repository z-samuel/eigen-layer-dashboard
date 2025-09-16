const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallback for React Native modules that aren't needed in web
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        'react-native-sqlite-storage': false,
      };

      // Add alias to ignore React Native driver
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'react-native-sqlite-storage': false,
      };

      // Add plugin to ignore the React Native driver warning
      webpackConfig.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^react-native-sqlite-storage$/,
        })
      );

      return webpackConfig;
    },
  },
};
