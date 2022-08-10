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

  expect(router.$path).toEqual(['home']);
  expect(router.$view).toEqual({user: 'vilicvane'});

  expect(router.home.$view).toEqual({user: 'vilicvane'});

  expect(router.home.hello.$view).toBe(undefined);

  expect(router.about.$view).toBe(undefined);

  router.home({user: '123'}).hello({}).$push();

  expect(router.home.$view).toEqual({user: '123'});

  expect(router.home.hello.$view).toEqual({
    user: '123',
    name: '',
    extra: '123',
  });

  type _ =
    | AssertTrue<IsEqual<typeof router.home.$view, {user: string} | undefined>>
    | AssertTrue<
        IsEqual<
          typeof router.home.hello.$view,
          {user: string; name: string; extra: string} | undefined
        >
      >;
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
