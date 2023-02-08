import {reaction} from 'mobx';
import type {AssertTrue, IsEqual} from 'tslang';

import type {RouteNode__, ViewSwitchingRelationship} from '../library';
import {RouteClass, RouteNodeClass, routra} from '../library';

test('simple case 1', async () => {
  const router = routra({
    $children: {
      home: {
        $state: {
          user: 'vilicvane',
        },
        $children: {
          hello: {
            $state: {
              name: '',
            },
          },
          world: true,
        },
      },
      about: true,
    },
  });

  await router.home.$reset().$completed;

  expect(router.home.$view().$entries).toMatchObject([
    {
      $key: 1,
      $entering: false,
      $leaving: false,
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

  expect(router.home.$view().$entries).toMatchObject([
    {
      $key: 2,
      $entering: false,
      $leaving: false,
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
      $entering: false,
      $leaving: false,
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

  expect(router.home.$view().$entries[0].user).toBe('123');
  expect(() => {
    router.home.$view().$entries[0].user = 'abc';
  }).toThrow(TypeError);

  type _ =
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
      $children: {
        inbox: {
          $children: {
            message: {
              $state: undefined! as {
                id: string;
              },
            },
          },
        },
        home: true,
        about: true,
      },
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
      $rel: 'to',
      progress: 0,
    },
    {
      $rel: 'to',
      progress: 0.1,
    },
    {
      $rel: 'to',
      progress: 0.3,
    },
    {
      $rel: 'to',
      progress: 0.8,
    },
  ]);

  expect(switchingFromStates_1).toEqual([
    {
      $rel: 'from',
      progress: 0,
    },
    {
      $rel: 'from',
      progress: 0.1,
    },
    {
      $rel: 'from',
      progress: 0.3,
    },
    {
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
        $rel: 'from',
        progress: 0.8,
      },
    },
  ]);

  expect(router.inbox.$view().$entries).toMatchObject([
    {
      $switching: {
        $rel: 'to',
        progress: 0.8,
      },
    },
  ]);

  expect(router.inbox.message.$view().$entries).toMatchObject([
    {
      $switching: {
        $rel: 'to',
        progress: 0.8,
      },
    },
  ]);

  switching_1.$complete();

  expect(router.home.$view().$entries).toEqual([]);

  expect(router.inbox.$view().$entries).toMatchObject([
    {
      $entering: false,
      $leaving: false,
      $switching: false,
    },
  ]);

  expect(router.inbox.message.$view().$entries).toMatchObject([
    {
      $entering: false,
      $leaving: false,
      $switching: false,
    },
  ]);

  type _ = AssertTrue<
    IsEqual<
      Pick<RouteViewEntry<typeof router.home>, '$switching'>,
      {
        $switching:
          | {
              $rel: ViewSwitchingRelationship;
              progress: number;
            }
          | false;
      }
    >
  >;
});

test('$exact false support', () => {
  const router_1 = routra({
    $children: {
      home: {
        $exact: false,
        $children: {
          hello: true,
          world: true,
        },
      },
      about: true,
    },
  });

  expect(router_1.home instanceof RouteNodeClass).toBe(true);
  expect(router_1.home instanceof RouteClass).toBe(false);
  expect(router_1.home.world instanceof RouteClass).toBe(true);
  expect(router_1.about instanceof RouteClass).toBe(true);

  type _ =
    | AssertTrue<typeof router_1.home extends {$reset: unknown} ? false : true>
    | AssertTrue<
        typeof router_1.home.world extends {$reset: unknown} ? true : false
      >;
});

type RouteViewEntry<T extends RouteNode__> = ReturnType<
  T['$view']
>['$entries'][number];

type PickDynamic<T extends object> = Omit<T, `${'$' | '_'}${string}`>;
