module.exports = {
  source: {
    include: [
      './server',
      './client/src',
      './shared',
      './README.md'
    ],
    includePattern: '\\.(js|jsx|ts|tsx)$',
    exclude: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      'test-reports'
    ],
    excludePattern: '(node_modules/|dist/|build/|coverage/|test-reports/)'
  },
  opts: {
    destination: './docs/jsdoc',
    recurse: true,
    template: 'node_modules/docdash'
  },
  plugins: [
    'plugins/markdown'
  ],
  templates: {
    default: {
      outputSourceFiles: true,
      includeDate: true,
      useLongnameInNav: true,
      static: true,
      search: true,
      collapseSymbols: true,
      sort: 'longname'
    }
  },
  docdash: {
    static: true,
    sort: true,
    search: true,
    collapse: true,
    wrap: true,
    typedefs: true,
    removeQuotes: 'none',
    menu: {
      'Home': {
        href: 'index.html',
        title: 'FilaPrint Documentation'
      },
      'API Reference': {
        href: 'global.html',
        title: 'API Reference'
      },
      'Classes': {
        href: 'classes.html',
        title: 'Classes'
      },
      'Modules': {
        href: 'modules.html',
        title: 'Modules'
      }
    }
  }
};


