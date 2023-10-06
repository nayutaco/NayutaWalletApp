import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, FlatList, View, Linking} from 'react-native';

import Page from 'components/projects/Page';
import additionalLicenses from 'misc/additional_licenses.json';
import _licenses from 'misc/licenses.json';
import {colors, fontSizes, typographyFonts} from 'styles/variables';

const licenses = [...additionalLicenses, ..._licenses];

/**
 * Return the opensource screen
 * @returns {JSX.Element} About OpenSource Screen
 */
export const SupportOpenSourceScreen = () => {
  const {t} = useTranslation();

  return (
    <Page title={t('support:license')}>
      <FlatList data={licenses} renderItem={Item} keyExtractor={keyExtractor} />
    </Page>
  );
};
type LibEntry = typeof licenses[number];
function Item({item}: {item: LibEntry & {key?: string}}) {
  return (
    <View style={styles.item}>
      <Text style={styles.name}>{item.name}</Text>
      {item.url && (
        <Text
          style={styles.uri}
          onPress={() => {
            Linking.openURL(item.url);
          }}>
          {item.url}
        </Text>
      )}
      <Text style={styles.copyright}>Copyright (c) {item.copyrightHolder} All rights reserved.</Text>
      <Text style={styles.licenseText}>{item.licenseText}</Text>
    </View>
  );
}
function keyExtractor(item: LibEntry) {
  return item.name;
}

const styles = StyleSheet.create({
  item: {
    padding: 8,
    marginVertical: 16,
    backgroundColor: colors.transparent,
    borderStyle: 'dotted',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  name: {
    color: '#000000',
    fontFamily: typographyFonts.notoSansBold,
    fontSize: fontSizes.basic4,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  uri: {
    marginVertical: 16,
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic6,
    color: '#3070f0',
  },
  copyright: {
    color: '#000000',
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic6,
  },
  licenseText: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic6,
    color: '#222',
    padding: 8,
    marginBottom: 8,
  },
});
