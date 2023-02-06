import {routra} from './routra';

const router = routra(
  {
    $children: {
      foo: {
        $state: {
          id: '',
        },
        $children: {
          bar: {
            $state: {
              source: '',
            },
          },
        },
      },
    },
  },
  {
    defaultSwitchingState: {
      progress: 0,
    },
  },
);

const switching = router.foo.bar.$push.$switch({
  id: '123',
  source: 'abc',
});

switching({
  progress: 0.5,
});

switching.$complete();

const view = routra.$view([router.foo.bar])._entries[0];
