module.exports = {
  extends: '@mufan/code-boilerplates/typescript',
  options: {
    name: 'routra',
    description: `Routra`,
    repository: 'https://github.com/vilic/routra.git',
    license: 'MIT',
    author: 'vilicvane',
    tsProjects: [
      {
        name: 'library',
      },
      {
        name: 'test',
        noEmit: true,
        references: ['library'],
      },
    ],
  },
};
