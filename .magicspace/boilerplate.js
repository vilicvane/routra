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
        tsProjects: [
          {
            name: 'library',
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
