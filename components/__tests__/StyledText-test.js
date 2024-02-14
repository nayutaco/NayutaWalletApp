import React from 'react';
import renderer from 'react-test-renderer';

// eslint-disable-next-line import/no-unresolved
import {MonoText} from '../StyledText';

it('renders correctly', () => {
  const tree = renderer.create(<MonoText>Snapshot test!</MonoText>).toJSON();

  expect(tree).toMatchSnapshot();
});
