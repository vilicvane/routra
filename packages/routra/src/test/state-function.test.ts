import assert from 'assert';

import {routra} from '../library/index.js';

test('state function', async () => {
  let count = 0;

  const router = routra({
    home: {
      $state: {
        user: 'vilicvane',
      },
      hello: {
        $state(name: string, {user}: {user: string}) {
          assert(typeof name === 'string', 'Expected `name` to be string');

          return {
            name,
            get userUpperCase() {
              return user.toUpperCase();
            },
          };
        },
      },
      world: {
        $state() {
          return {
            count: ++count,
          };
        },
      },
    },
    about: true,
  });

  await router.home.$reset().$completed;

  await expect(
    () => router.home.hello.$push().$completed,
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    '"Expected `name` to be string"',
  );

  await router.home.hello('wsh').$reset().$completed;

  expect(router.home.hello.$view().$entries[0].name).toBe('wsh');
  expect(router.home.hello.$view().$entries[0].userUpperCase).toBe('VILICVANE');

  router.$restore(router.$snapshot!);

  expect(router.home.hello.$view().$entries[0].name).toBe('wsh');
  expect(router.home.hello.$view().$entries[0].userUpperCase).toBe('VILICVANE');

  await router.home.world.$push().$completed;

  // `world` here to use default.
  expect(router.home.world.$view().$entries[0].count).toBe(1);

  router.$restore(router.$snapshot!);

  expect(router.home.world.$view().$entries[0].count).toBe(2);

  // `world()` here to update state.
  await router.home.world().$push().$completed;

  expect(router.home.world.$view().$entries[0].count).toBe(3);

  // `world` here to reuse state.
  await router.home.world.$push().$completed;

  expect(router.home.world.$view().$entries[0].count).toBe(3);
});
