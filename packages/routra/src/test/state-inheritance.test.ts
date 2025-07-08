import {autorun, runInAction} from 'mobx';

import {routra} from '../library/index.js';

test('push', async () => {
  const router = routra({
    home: {
      $state: {
        user: 'vilicvane',
      },
      hello: {
        $state: {
          name: '',
        },
      },
      world: true,
    },
    about: true,
  });

  await router.home.$reset().$completed;

  let observedUser: string | undefined;

  autorun(() => {
    observedUser = router.home.$view().$entries[0].user;
  });

  expect(observedUser).toBe('vilicvane');
  expect(router.home.$view().$entries[0].user).toBe('vilicvane');

  const pushResult = router.home.hello.$push({user: 'zhang3'});

  expect(observedUser).toBe('vilicvane');
  expect(router.home.$view().$entries[0].user).toBe('vilicvane');
  expect(router.home.$view().$entries[1].user).toBe('zhang3');

  runInAction(() => {
    router.home.hello.$view().$entries[0].user = 'li4';
  });

  await pushResult.$completed;

  expect(observedUser).toBe('li4');
  expect(router.home.$view().$entries[0].user).toBe('li4');
  expect(router.home.hello.$view().$entries[0].user).toBe('li4');

  runInAction(() => {
    router.home.hello.$view().$entries[0].user = 'wang5';
  });

  expect(observedUser).toBe('wang5');
  expect(router.home.$view().$entries[0].user).toBe('wang5');
});

test('switch', async () => {
  const router = routra(
    {
      home: {
        $state: {
          user: 'vilicvane',
        },
        hello: {
          $state: {
            name: '',
          },
        },
        world: true,
      },
      about: true,
    },
    {
      defaultSwitchingState: {
        progress: 0,
      },
    },
  );

  await router.home.$reset().$completed;

  let observedUser: string | undefined;

  autorun(() => {
    observedUser = router.home.$view().$entries[0].user;
  });

  expect(observedUser).toBe('vilicvane');
  expect(router.home.$view().$entries[0].user).toBe('vilicvane');

  const switching = router.home.hello.$push.$switch({user: 'zhang3'});

  expect(observedUser).toBe('vilicvane');
  expect(router.home.$view().$entries[0].user).toBe('vilicvane');
  expect(router.home.$view().$entries[1].user).toBe('zhang3');

  switching({progress: 0.1});

  expect(observedUser).toBe('vilicvane');
  expect(router.home.$view().$entries[0].user).toBe('vilicvane');
  expect(router.home.$view().$entries[1].user).toBe('zhang3');

  switching.$complete();

  expect(observedUser).toBe('zhang3');
  expect(router.home.$view().$entries[0].user).toBe('zhang3');
  expect(router.home.hello.$view().$entries[0].user).toBe('zhang3');

  runInAction(() => {
    router.home.hello.$view().$entries[0].user = 'li4';
  });

  expect(observedUser).toBe('li4');
  expect(router.home.$view().$entries[0].user).toBe('li4');
});

test('switch back', async () => {
  const router = routra(
    {
      home: {
        $state: {
          user: 'vilicvane',
        },
        hello: {
          $state: {
            name: '',
          },
        },
        world: true,
      },
      about: true,
    },
    {
      defaultSwitchingState: {
        progress: 0,
      },
    },
  );

  await router.home.$reset().$completed;

  await router.home.hello.$push({user: 'zhang3'}).$completed;

  expect(router.home.$view().$entries[0].user).toBe('zhang3');
  expect(router.home.hello.$view().$entries[0].user).toBe('zhang3');

  runInAction(() => {
    router.home.hello.$view().$entries[0].user = 'li4';
  });

  expect(router.home.$view().$entries[0].user).toBe('li4');

  const switching = router.$back!.$switch();

  expect(router.home.$view().$entries[0].user).toBe('li4');

  switching.$complete();

  expect(router.home.$view().$entries[0].user).toBe('li4');
});
