module.exports = {
  extends: '@mufan/code-boilerplates/typescript',
  options: {
    name: 'pile-em-up',
    description: `Pile 'Em Up`,
    repository: 'https://github.com/vilic/pile-em-up.git',
    license: 'MIT',
    author: 'vilicvane',
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
};
