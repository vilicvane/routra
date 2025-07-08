import {reaction, runInAction} from 'mobx';
import type {AssertTrue, IsEqual} from 'tslang';

import type {
  RouteNodeClass__,
  RouterOperation,
  ViewSwitchingRelationship,
} from '../library/index.js';
import {RouteClass, RouteNodeClass, routra} from '../library/index.js';

test('simple case 1', async () => {
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

  expect(router.$routes).toEqual([router.home]);

  expect(router.home.$view().$entries).toMatchObject([
    {
      $key: 1,
      $entering: undefined,
      $leaving: undefined,
      $match: expect.objectContaining({
        $exact: expect.objectContaining({}),
        $path: ['home'],
        $active: true,
        $transition: false,
        $switching: false,
      }),
      user: 'vilicvane',
    },
  ]);

  expect(router.home.hello.$view().$entries).toEqual([]);

  await router.home.hello.$push({user: '123'}).$completed;

  expect(router.$routes).toEqual([router.home, router.home.hello]);

  expect(router.home.$view().$entries).toMatchObject([
    {
      $key: 2,
      $entering: undefined,
      $leaving: undefined,
      $match: expect.objectContaining({
        $exact: expect.objectContaining({}),
        $path: ['home'],
        $active: true,
        $transition: false,
        $switching: false,
      }),
      user: '123',
    },
  ]);

  expect(router.home.hello.$view().$entries).toMatchObject([
    {
      $key: 3,
      $entering: undefined,
      $leaving: undefined,
      $match: expect.objectContaining({
        $path: ['home', 'hello'],
        $active: true,
        $transition: false,
        $switching: false,
      }),
      user: '123',
      name: '',
    },
  ]);

  let observedUser: string | undefined;

  const dispose = reaction(
    () => router.home.$view().$entries[0].user,
    user => {
      observedUser = user;
    },
  );

  runInAction(() => {
    router.home.$view().$entries[0].user = '456';
  });

  dispose();

  expect(router.home.$view().$entries[0].user).toBe('456');
  expect(observedUser).toBe('456');

  type _Assert =
    | AssertTrue<
        IsEqual<
          PickDynamic<RouteViewEntry<typeof router.home>>,
          {
            user: string;
          }
        >
      >
    | AssertTrue<
        IsEqual<
          PickDynamic<RouteViewEntry<typeof router.home.hello>>,
          {
            user: string;
            name: string;
          }
        >
      >;
});

test('switching', async () => {
  const router = routra(
    {
      inbox: {
        message: {
          $state: undefined! as {
            id: string;
          },
        },
      },
      home: true,
      about: true,
    },
    {
      defaultSwitchingState: {
        progress: 0,
      },
    },
  );

  await router.home.$reset().$completed;

  const switchingToStates_1: unknown[] = [];
  const switchingFromStates_1: unknown[] = [];

  reaction(
    () => {
      const switching = router.inbox.message.$view().$entries[0]?.$switching;

      return switching && {...switching};
    },
    state => {
      switchingToStates_1.push(state);
    },
  );

  reaction(
    () => {
      const switching = router.home.$view().$entries[0]?.$switching;

      return switching && {...switching};
    },
    state => {
      switchingFromStates_1.push(state);
    },
  );

  const switching_1 = router.inbox
    .message({id: 'abc'})
    .$push.$switch({}, {progress: 0});

  switching_1({progress: 0.1});
  switching_1({progress: 0.3});
  switching_1({progress: 0.8});

  expect(switchingToStates_1).toEqual([
    {
      $operation: 'push',
      $rel: 'to',
      progress: 0,
    },
    {
      $operation: 'push',
      $rel: 'to',
      progress: 0.1,
    },
    {
      $operation: 'push',
      $rel: 'to',
      progress: 0.3,
    },
    {
      $operation: 'push',
      $rel: 'to',
      progress: 0.8,
    },
  ]);

  expect(switchingFromStates_1).toEqual([
    {
      $operation: 'push',
      $rel: 'from',
      progress: 0,
    },
    {
      $operation: 'push',
      $rel: 'from',
      progress: 0.1,
    },
    {
      $operation: 'push',
      $rel: 'from',
      progress: 0.3,
    },
    {
      $operation: 'push',
      $rel: 'from',
      progress: 0.8,
    },
  ]);

  expect(router.inbox.$switching).toBe(true);
  expect(router.home.$switching).toBe(false);
  expect(router.about.$switching).toBe(false);

  expect(router.home.$view().$entries).toMatchObject([
    {
      $switching: {
        $operation: 'push',
        $rel: 'from',
        progress: 0.8,
      },
    },
  ]);

  expect(router.inbox.$view().$entries).toMatchObject([
    {
      $switching: {
        $operation: 'push',
        $rel: 'to',
        progress: 0.8,
      },
    },
  ]);

  expect(router.inbox.message.$view().$entries).toMatchObject([
    {
      $switching: {
        $operation: 'push',
        $rel: 'to',
        progress: 0.8,
      },
    },
  ]);

  switching_1.$complete();

  expect(router.home.$view().$entries).toEqual([]);

  expect(router.inbox.$view().$entries).toMatchObject([
    {
      $entering: undefined,
      $leaving: undefined,
      $switching: undefined,
    },
  ]);

  expect(router.inbox.message.$view().$entries).toMatchObject([
    {
      $entering: undefined,
      $leaving: undefined,
      $switching: undefined,
    },
  ]);

  const switching_2 = router.inbox
    .message({id: 'abc'})
    .$replace.$switch({}, {progress: 0});

  expect(router.inbox.message.$view().$entries).toMatchObject([
    {
      $switching: {
        $operation: 'replace',
        $rel: 'from',
        progress: 0,
      },
    },
    {
      $switching: {
        $operation: 'replace',
        $rel: 'to',
        progress: 0,
      },
    },
  ]);

  switching_2.$complete();

  expect(router.inbox.message.$view().$entries).toMatchObject([
    {
      $entering: undefined,
      $leaving: undefined,
      $switching: undefined,
    },
  ]);

  type _Assert = AssertTrue<
    IsEqual<
      Pick<RouteViewEntry<typeof router.home>, '$switching'>,
      {
        $switching:
          | {
              $operation: RouterOperation;
              $rel: ViewSwitchingRelationship;
              progress: number;
            }
          | undefined;
      }
    >
  >;
});

test('$exact false support', () => {
  const router_1 = routra({
    home: {
      $exact: false,
      hello: true,
      world: true,
    },
    about: true,
  });

  expect(router_1.home instanceof RouteNodeClass).toBe(true);
  expect(router_1.home instanceof RouteClass).toBe(false);
  expect(router_1.home.world instanceof RouteClass).toBe(true);
  expect(router_1.about instanceof RouteClass).toBe(true);

  type _Assert =
    | AssertTrue<typeof router_1.home extends {$reset: unknown} ? false : true>
    | AssertTrue<
        typeof router_1.home.world extends {$reset: unknown} ? true : false
      >;
});

test('$backTo', async () => {
  const router_1 = routra({
    home: {
      hello: true,
      world: true,
    },
    about: true,
  });

  await router_1.home.$reset().$completed;
  await router_1.home.hello.$push().$completed;

  expect(router_1.home.$active).toBe(true);
  expect(router_1.home.hello.$active).toBe(true);

  await router_1.about.$push().$completed;

  expect(router_1.home.$active).toBe(false);
  expect(router_1.home.hello.$active).toBe(false);
  expect(router_1.about.$active).toBe(true);

  await router_1.$backTo(router_1.home)?.$go().$completed;

  expect(router_1.home.$active).toBe(true);
  expect(router_1.home.hello.$active).toBe(true);
  expect(router_1.about.$active).toBe(false);
});

test('$snapshot', async () => {
  const schema = {
    home: {
      hello: true,
      world: true,
    },
    about: true,
  } as const;

  const router_1 = routra(schema);

  router_1.home.$reset();
  router_1.home.hello.$push();

  await router_1.about.$push().$completed;

  const snapshot = router_1.$snapshot!;

  expect(snapshot).toMatchInlineSnapshot(`
{
  "entry": {
    "next": undefined,
    "path": [
      "about",
    ],
    "previous": {
      "next": undefined,
      "path": [
        "home",
        "hello",
      ],
      "previous": {
        "next": undefined,
        "path": [
          "home",
        ],
        "previous": undefined,
        "states": [
          1,
        ],
      },
      "states": [
        1,
        2,
      ],
    },
    "states": [
      0,
    ],
  },
  "objects": [
    {},
    {},
    {},
  ],
  "operation": "push",
}
`);

  const router_2 = routra(schema);

  router_2.$restore(snapshot);

  expect(router_2.home.$active).toBe(false);
  expect(router_2.home.hello.$active).toBe(false);
  expect(router_2.about.$active).toBe(true);

  await router_2.$backTo(router_2.home)!.$go().$completed;

  expect(router_2.home.$active).toBe(true);
  expect(router_2.home.hello.$active).toBe(true);
  expect(router_2.about.$active).toBe(false);

  expect(router_2.$snapshot).toMatchInlineSnapshot(`
{
  "entry": {
    "next": {
      "next": undefined,
      "path": [
        "about",
      ],
      "previous": undefined,
      "states": [
        2,
      ],
    },
    "path": [
      "home",
      "hello",
    ],
    "previous": {
      "next": undefined,
      "path": [
        "home",
      ],
      "previous": undefined,
      "states": [
        0,
      ],
    },
    "states": [
      0,
      1,
    ],
  },
  "objects": [
    {},
    {},
    {},
  ],
  "operation": -1,
}
`);

  await router_2.$forward!.$go().$completed;

  expect(router_2.home.$active).toBe(false);
  expect(router_2.home.hello.$active).toBe(false);
  expect(router_2.about.$active).toBe(true);

  expect(router_2.$snapshot).toMatchInlineSnapshot(`
{
  "entry": {
    "next": undefined,
    "path": [
      "about",
    ],
    "previous": {
      "next": undefined,
      "path": [
        "home",
        "hello",
      ],
      "previous": {
        "next": undefined,
        "path": [
          "home",
        ],
        "previous": undefined,
        "states": [
          1,
        ],
      },
      "states": [
        1,
        2,
      ],
    },
    "states": [
      0,
    ],
  },
  "objects": [
    {},
    {},
    {},
  ],
  "operation": 1,
}
`);

  await router_2.$back!.$go().$completed;
  await router_2.$back!.$go().$completed;

  await router_2.$forwardTo(router_2.about)!.$go().$completed;

  expect(router_2.$snapshot).toMatchInlineSnapshot(`
{
  "entry": {
    "next": undefined,
    "path": [
      "about",
    ],
    "previous": {
      "next": undefined,
      "path": [
        "home",
        "hello",
      ],
      "previous": {
        "next": undefined,
        "path": [
          "home",
        ],
        "previous": undefined,
        "states": [
          1,
        ],
      },
      "states": [
        1,
        2,
      ],
    },
    "states": [
      0,
    ],
  },
  "objects": [
    {},
    {},
    {},
  ],
  "operation": 2,
}
`);
});

type RouteViewEntry<T extends RouteNodeClass__> = ReturnType<
  T['$view']
>['$entries'][number];

type PickDynamic<T extends object> = Omit<T, `${'$' | '_'}${string}`>;
