import {reaction, runInAction} from 'mobx';
import type {AssertTrue, IsEqual} from 'tslang';

import {RouteClass_, RouteNodeClass_, routra} from '../library';

test('simple case 1', async () => {
  const router = routra({
    $children: {
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
  });

  const homeView = router.home.$view();

  router.home.$reset();

  await new Promise(resolve => setTimeout(resolve, 100));

  expect(homeView.$entries).toMatchObject([
    {
      $key: 1,
      $entering: false,
      $leaving: false,
    },
  ]);
  // expect(homeView.$entries[0].$entering).toEqual(false);
  // expect(homeView.$entries[0].$entering).toEqual(false);
  // expect(homeView.$entries[0].$leaving).toEqual(false);

  // expect(router.home.hello.$views).toEqual([]);

  // expect(router.about.$views).toEqual([]);

  // router.home.hello.$push({user: '123'});

  // expect(router.home.$views).toMatchInlineSnapshot(`
  //   [
  //     {
  //       "$afterTransition": undefined,
  //       "$exact": false,
  //       "$id": 2,
  //       "$path": [
  //         "home",
  //         "hello",
  //       ],
  //       "$transition": undefined,
  //       "user": "123",
  //     },
  //   ]
  // `);

  // expect(router.home.hello.$views).toMatchInlineSnapshot(`
  //   [
  //     {
  //       "$afterTransition": undefined,
  //       "$exact": true,
  //       "$id": 2,
  //       "$path": [
  //         "home",
  //         "hello",
  //       ],
  //       "$transition": undefined,
  //       "extra": "123",
  //       "name": "",
  //       "user": "123",
  //     },
  //   ]
  // `);

  // runInAction(() => {
  //   router.home.hello.$views[0].user = 'abc';
  // });

  // expect(router.home.$views[0].user).toBe('abc');

  // type _ =
  //   | AssertTrue<
  //       IsEqual<
  //         typeof router.home.$views,
  //         {
  //           $id: number;
  //           $path: ['home'];
  //           $exact: boolean;
  //           $transition: undefined;
  //           $afterTransition: undefined;
  //           user: string;
  //         }[]
  //       >
  //     >
  //   | AssertTrue<
  //       IsEqual<
  //         typeof router.home.hello.$views,
  //         {
  //           $id: number;
  //           $path: ['home', 'hello'];
  //           $exact: boolean;
  //           $transition: undefined;
  //           $afterTransition: undefined;
  //           user: string;
  //           name: string;
  //           extra: string;
  //         }[]
  //       >
  //     >;
});

// test('multiple view builders', () => {
//   const router = routra({
//     home: {
//       $state: {
//         a: 1,
//         b: 2,
//       },
//     },
//   })
//     .$views({
//       $transition: 0,
//       home: {
//         $view: [
//           _state => {
//             return {
//               b: 'b',
//               c: true,
//             };
//           },
//           () => {
//             return {
//               c: 1,
//               d: true,
//             };
//           },
//         ],
//       },
//     })
//     .$create();

//   router.home.$reset();

//   expect(router.home.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": true,
//         "$id": 3,
//         "$path": [
//           "home",
//         ],
//         "$transition": undefined,
//         "a": 1,
//         "b": "b",
//         "c": 1,
//         "d": true,
//       },
//     ]
//   `);

//   type _ = AssertTrue<
//     IsEqual<
//       typeof router.home.$views,
//       {
//         $id: number;
//         $path: ['home'];
//         $exact: boolean;
//         $transition: number | undefined;
//         $afterTransition: number | undefined;
//         a: number;
//         b: string;
//         c: number;
//         d: boolean;
//       }[]
//     >
//   >;
// });

// test('push pop with shared states', () => {
//   const router = routra({
//     home: {
//       $state: {
//         user: 'admin',
//       },
//       hello: {
//         $state: {
//           name: '',
//         },
//       },
//     },
//   }).$create();

//   router.home.$reset();

//   router.home.hello.$push({user: 'abc'});

//   expect(router.home.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": false,
//         "$id": 5,
//         "$path": [
//           "home",
//           "hello",
//         ],
//         "$transition": undefined,
//         "user": "abc",
//       },
//     ]
//   `);

//   expect(router.home.hello.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": true,
//         "$id": 5,
//         "$path": [
//           "home",
//           "hello",
//         ],
//         "$transition": undefined,
//         "name": "",
//         "user": "abc",
//       },
//     ]
//   `);

//   router.$back();

//   expect(router.home.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": true,
//         "$id": 4,
//         "$path": [
//           "home",
//         ],
//         "$transition": undefined,
//         "user": "abc",
//       },
//     ]
//   `);

//   expect(router.home.hello.$views).toEqual([]);
// });

// test('transition', () => {
//   const router = routra({
//     inbox: {
//       message: {
//         $state: undefined! as {
//           id: string;
//         },
//       },
//     },
//     home: true,
//   })
//     .$views({
//       $transition: undefined as
//         | {
//             progress: number;
//           }
//         | undefined,
//     })
//     .$create();

//   router.home.$reset();

//   const transitionStates_1: unknown[] = [];

//   reaction(
//     () => router.inbox.message.$views[0]?.$transition,
//     state => {
//       transitionStates_1.push(state);
//     },
//   );

//   const transition_1 = router.inbox
//     .message({id: 'abc'})
//     .$push.$transition({}, {progress: 0});

//   transition_1({progress: 0.1});
//   transition_1({progress: 0.3});
//   transition_1({progress: 0.8});

//   expect(transitionStates_1).toEqual([
//     {progress: 0},
//     {progress: 0.1},
//     {progress: 0.3},
//     {progress: 0.8},
//   ]);

//   expect(router.home.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": true,
//         "$id": 6,
//         "$path": [
//           "home",
//         ],
//         "$transition": undefined,
//       },
//     ]
//   `);

//   expect(router.inbox.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": false,
//         "$id": 7,
//         "$path": [
//           "inbox",
//           "message",
//         ],
//         "$transition": {
//           "progress": 0.8,
//         },
//       },
//     ]
//   `);

//   expect(router.inbox.message.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": undefined,
//         "$exact": true,
//         "$id": 7,
//         "$path": [
//           "inbox",
//           "message",
//         ],
//         "$transition": {
//           "progress": 0.8,
//         },
//         "id": "abc",
//       },
//     ]
//   `);

//   transition_1.$complete();

//   expect(router.home.$views).toEqual([]);

//   expect(router.inbox.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": {
//           "progress": 0.8,
//         },
//         "$exact": false,
//         "$id": 7,
//         "$path": [
//           "inbox",
//           "message",
//         ],
//         "$transition": undefined,
//       },
//     ]
//   `);

//   expect(router.inbox.message.$views).toMatchInlineSnapshot(`
//     [
//       {
//         "$afterTransition": {
//           "progress": 0.8,
//         },
//         "$exact": true,
//         "$id": 7,
//         "$path": [
//           "inbox",
//           "message",
//         ],
//         "$transition": undefined,
//         "id": "abc",
//       },
//     ]
//   `);

//   type _ = AssertTrue<
//     IsEqual<
//       typeof router.home.$views,
//       {
//         $id: number;
//         $path: ['home'];
//         $exact: boolean;
//         $transition: {progress: number} | undefined;
//         $afterTransition: {progress: number} | undefined;
//       }[]
//     >
//   >;
// });

// test('unexpected view key', () => {
//   const router_1 = routra({
//     home: {
//       hello: true,
//       world: true,
//     },
//     about: true,
//   })
//     .$views({
//       home: {
//         hello: {},
//       },
//       foo: true,
//     })
//     .$create();

//   const router_2 = routra({
//     home: {
//       hello: true,
//       world: true,
//     },
//     about: true,
//   })
//     .$views({
//       home: {
//         hello: {
//           world: {
//             $view() {},
//           },
//         },
//       },
//     })
//     .$create();

//   type _ =
//     | AssertTrue<
//         IsEqual<typeof router_1, {TypeError: 'Unexpected view key "foo"'}>
//       >
//     | AssertTrue<
//         IsEqual<
//           typeof router_2.home.hello,
//           {TypeError: 'Unexpected view key "world"'}
//         >
//       >;
// });

// test('$exact false support', () => {
//   const router_1 = routra({
//     home: {
//       $exact: false,
//       hello: true,
//       world: true,
//     },
//     about: true,
//   }).$create();

//   expect(router_1.home instanceof RouteNodeClass_).toBe(true);
//   expect(router_1.home instanceof RouteClass_).toBe(false);
//   expect(router_1.home.world instanceof RouteClass_).toBe(true);
//   expect(router_1.about instanceof RouteClass_).toBe(true);

//   type _ =
//     | AssertTrue<typeof router_1.home extends {$reset: unknown} ? false : true>
//     | AssertTrue<
//         typeof router_1.home.world extends {$reset: unknown} ? true : false
//       >;
// });
