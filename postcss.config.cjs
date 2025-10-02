module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          colorMin: true,
          minifyFontValues: true,
          minifySelectors: true,
        }]
      }
    } : {})
  },
}
