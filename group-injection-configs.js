/*
 * This file configures exemptions/alterations to the injection pattern.
 * Order of the entries here matters!!!
 * The first matching regex dictates which paths array gets used.
 * Be careful!!!
 */

module.exports = [
  // { // documentation
  //   regex: /^documentation\//,
  //   paths: []
  // },
  { // default - must remain as the last entry!!!
    regex: /.*/,
    paths: [
      { source: 'injectables/.gitignore', target: '.gitignore' },
      { source: 'injectables/.gitlab-ci.yml', target: '.gitlab-ci.yml' },
      { source: 'injectables/README.md', target: 'README.md' }
    ]
  }
];