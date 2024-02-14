module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
