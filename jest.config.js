/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['packages/routra/src/test'],
  projects: [
    {
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: 'packages/routra/src/test/tsconfig.json',
            diagnostics: {
              ignoreCodes: ['TS151001'],
            },
          },
        ],
      },
    },
  ],
};
