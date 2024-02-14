/**
 * @format
 */

import 'react-native';
import {it} from '@jest/globals';
import React from 'react';

import renderer from 'react-test-renderer';

import App from '../App';

// Note: import explicitly to use the types shiped with jest.

// Note: test renderer must be required after react-native.

jest.mock('react-native-background-timer', () => {
  return {
    runBackgroundTimer: jest.fn(),
    stopBackgroundTimer: jest.fn(),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  return {
    createNativeStackNavigator: jest.fn(),
  };
});

it('renders correctly', () => {
  renderer.create(<App />);
});
