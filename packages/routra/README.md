<h1 align="center">Routra</h1>
<p align="center">Just another state router with transition support.</p>

```tsx
const App = () => {
  return (
    <>
      <Route match={router.foo.bar} component={FooBar}></Route>
      <Button
        onClick={useEvent(() => {
          router.foo.bar.$push();
        })}
      >
        test
      </Button>
    </>
  );
};

// 两种处理 animation/transition end 的方式：
// 🙅 1. <Route /> 通过传入 routra-enter routra-leave 的 className 判断事件的 target 并自动处理
// 这种不行，因为外面的 Route 组件没法直接监听内部事件（没有 DOM）
// const FooBar = ({className, route}) => {
//   return <Wrapper className={className}>{}</Wrapper>;
// };
// 1.
const FooBar = ({view}) => {
  return <Wrapper {...transition.events}>{}</Wrapper>;

  return (
    <Wrapper
      {...transition.events.compose({
        onClick: () => {},
      })}
    >
      {}
    </Wrapper>
  );
};

// 2. 使用时不传递 className，手动触发相关函数
const FooBar = ({className, route}) => {
  useState(() => {
    route.$transition({
      enter: true,
      leave: true,
    });
  });

  return (
    <Wrapper
      onAnimationEnd={useEvent(() => {
        if (route.$entering) {
          route.$entering.$complete();
        } else if (route.$leaving) {
          route.$leaving.$complete();
        }
      })}
    >
      {}
    </Wrapper>
  );
};
```

为了避免混淆，手动控制的叫做 switch。

```ts
const router = routra({
  $children: {
    foo: {
      $children: {
        bar: {
          $switchingState: {
            progress: 0,
          },
        },
      },
    },
  },
  },
});

const switching = router.foo.bar.$push.$switch({
  progress: 0,
});

switching({
  progress: 0.1,
});

switching.$complete();
```

另一种就是由 view 处理的。

view 在加载时可以注册一个或多个 enter 和 leave，路由切换会在开始时触发所有的 enter/leave，当其全部完成后，完成路由切换。

```tsx
const View = ({view}) => {
  useState(() =>
    view.$transition({
      enter: true,
      leave: true,
    }),
  );

  useEffect(() => {
    view.$enter.$complete();
    view.$leave.$complete();
  }, []);
};
```

```tsx
const router = routra({
  $children: {},
});

const someView = routra.$view([router.login, router.inbox]);

const App = () => {
  return (
    <>
      <Route view={router.home.$exact.$view()} component={Home} />
      <Route
        view={routra.$view([router.login.$exact, router.inbox])}
        component={BottomSheet}
      />
    </>
  );
};
```

## License

MIT License.
