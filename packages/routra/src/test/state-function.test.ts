import assert from 'assert';

import {routra} from '../library';

test('state function', async () => {
  const router = routra({
    home: {
      $state: {
        user: 'vilicvane',
      },
      hello: {
        $state(name: string) {
          assert(typeof name === 'string', 'Expected `name` to be string');

          return {
            name,
          };
        },
      },
      world: true,
    },
    about: true,
  });

  await router.home.$reset().$completed;

  expect(() => router.home.hello.$push()).toThrowErrorMatchingInlineSnapshot(
    `"Expected \`name\` to be string"`,
  );

  await router.home.hello('wsh').$reset().$completed;

  expect(router.home.hello.$view().$entries[0].name).toBe('wsh');
});
