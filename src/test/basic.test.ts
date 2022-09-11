import {reaction, runInAction} from 'mobx';
import type {AssertTrue, IsEqual} from 'tslang';

import {Router} from '../library';

test('simple case 1', () => {
  const router = new Router(
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
      home: {
        hello: {
          $view(state) {
            return {
              extra: state.user,
            };
          },
        },
      },
    },
  );

  router.home.$reset();

  expect(router.home.$views).toEqual([
    {
      $exact: true,
      $transition: undefined,
      user: 'vilicvane',
    },
  ]);

  expect(router.home.hello.$views).toEqual([]);

  expect(router.about.$views).toEqual([]);

  router.home.hello.$push({user: '123'});

  expect(router.home.$views).toEqual([
    {
      $exact: false,
      $transition: undefined,
      user: '123',
    },
  ]);

  expect(router.home.hello.$views).toEqual([
    {
      $exact: true,
      $transition: undefined,
      user: '123',
      name: '',
      extra: '123',
    },
  ]);

  runInAction(() => {
    router.home.hello.$views[0].user = 'abc';
  });

  expect(router.home.$views[0].user).toBe('abc');

  type _ =
    | AssertTrue<
        IsEqual<
          typeof router.home.$views,
          {
            $exact: boolean;
            $transition: undefined;
            user: string;
          }[]
        >
      >
    | AssertTrue<
        IsEqual<
          typeof router.home.hello.$views,
          {
            $exact: boolean;
            $transition: undefined;
            user: string;
            name: string;
            extra: string;
          }[]
        >
      >;
});

test('push pop with shared states', () => {
  const router = new Router({
    home: {
      $state: {
        user: 'admin',
      },
      hello: {
        $state: {
          name: '',
        },
      },
    },
  });

  router.home.$reset();

  router.home.hello.$push({user: 'abc'});

  expect(router.home.$views).toEqual([
    {
      $exact: false,
      $transition: undefined,
      user: 'abc',
    },
  ]);

  expect(router.home.hello.$views).toEqual([
    {
      $exact: true,
      $transition: undefined,
      user: 'abc',
      name: '',
    },
  ]);

  router.$back();

  expect(router.home.$views).toEqual([
    {
      $exact: true,
      $transition: undefined,
      user: 'abc',
    },
  ]);

  expect(router.home.hello.$views).toEqual([]);
});

test('transition', () => {
  const router = new Router(
    {
      inbox: {
        message: {
          $state: undefined! as {
            id: string;
          },
        },
      },
      home: true,
    },
    {
      $transition: undefined as
        | {
            progress: number;
          }
        | undefined,
    },
  );

  router.home.$reset();

  const transitionStates_1: unknown[] = [];

  reaction(
    () => router.inbox.message.$views[0]?.$transition,
    state => {
      transitionStates_1.push(state);
    },
  );

  const transition_1 = router.inbox
    .message({id: 'abc'})
    .$push.$transition({}, {progress: 0});

  transition_1({progress: 0.1});
  transition_1({progress: 0.3});
  transition_1({progress: 0.8});

  expect(transitionStates_1).toEqual([
    {progress: 0},
    {progress: 0.1},
    {progress: 0.3},
    {progress: 0.8},
  ]);

  expect(router.home.$views).toEqual([
    {
      $exact: true,
      $transition: undefined,
    },
  ]);

  expect(router.inbox.$views).toEqual([
    {
      $exact: false,
      $transition: {progress: 0.8},
    },
  ]);

  expect(router.inbox.message.$views).toEqual([
    {
      $exact: true,
      $transition: {progress: 0.8},
      id: 'abc',
    },
  ]);

  transition_1.$complete();

  expect(router.home.$views).toEqual([]);

  expect(router.inbox.$views).toEqual([
    {
      $exact: false,
      $transition: undefined,
    },
  ]);

  expect(router.inbox.message.$views).toEqual([
    {
      $exact: true,
      $transition: undefined,
      id: 'abc',
    },
  ]);
});

test('unexpected view key', () => {
  const router_1 = new Router(
    {
      home: {
        hello: true,
        world: true,
      },
      about: true,
    },
    {
      home: {
        hello: {},
      },
      foo: true,
    },
  );

  const router_2 = new Router(
    {
      home: {
        hello: true,
        world: true,
      },
      about: true,
    },
    {
      home: {
        hello: {
          world: {
            $view() {},
          },
        },
      },
    },
  );

  type _ =
    | AssertTrue<
        IsEqual<typeof router_1, {TypeError: 'Unexpected view key "foo"'}>
      >
    | AssertTrue<
        IsEqual<
          typeof router_2.home.hello,
          {TypeError: 'Unexpected view key "world"'}
        >
      >;
});
