module.exports = {
  extends: '@mufan/code-boilerplates/typescript',
  options: {
    name: 'routra-packages',
    description: `Routra`,
    repository: 'https://github.com/vilic/routra.git',
    license: 'MIT',
    author: 'vilicvane',
    packages: [
      {
        name: 'routra',
        tsProjects: [
          {
            name: 'library',
            exportSourceAs: 'source',
          },
          {
            name: 'test',
            noEmit: true,
            references: ['library'],
          },
        ],
      },
    ],
  },
};
