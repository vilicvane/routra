[![MIT License](https://img.shields.io/badge/license-MIT-999999?style=flat-square)](./LICENSE)

<h1 align="center">Routra</h1>
<p align="center">Just another state router with transition support.</p>

## Installation

```bash
npm install routra routra-react
```

## Usage

```tsx
import {routra} from 'routra';
import {Route} from 'routra-react';

const router = routra({
  user: {
    profile: true,
    settings: true,
  },
});

const App = () => {
  return (
    <>
      <Route view={router.user.profile.$view()} component={UserProfileView} />
      <Route view={router.user.settings.$view()} component={UserSettingsView} />

      <Route
        view={routra.$view([router.user.profile, router.user.settings], {
          single: true,
        })}
        component={UserNavBarView}
      />
    </>
  );
};
```

```tsx
import classNames from 'classnames';
import {useEffect} from 'react';
import styled from 'styled-components';

const View = styled.div`
  &.entering {
    animation: ...;
  }

  &.leaving {
    animation: ...;
  }
`;

const UserProfileView = ({view, transition}) => {
  useEffect(() => {
    view.$transition({
      entering: true,
      leaving: true,
    });
  }, [view]);

  return (
    <View
      className={classNames({
        entering: view.$entering,
        leaving: view.$leaving,
      })}
      {...transition.events}
    >
      ...
    </View>
  );
};
```

## License

MIT License.
