module.exports = {
  boilerplate: '@mufan/code-boilerplates/typescript',
  options: {
    name: 'routra-packages',
    description: `Routra`,
    repository: 'https://github.com/vilic/routra.git',
    license: 'MIT',
    author: 'vilicvane',
    packages: [
      {
        name: 'routra',
        projects: [
          {
            name: 'library',
            module: ['cjs', 'esm'],
          },
          {
            name: 'test',
            noEmit: true,
            references: ['library'],
          },
        ],
      },
      {
        name: 'routra-react',
        projects: [
          {
            name: 'library',
            module: ['cjs', 'esm'],
            references: [
              {
                package: 'routra',
                project: 'library',
              },
            ],
          },
        ],
      },
    ],
  },
};
