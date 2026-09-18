import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { AssetInfo } from '../constants/assets';

interface ScreenWrapperProps {
  asset: AssetInfo;
  children?: React.ReactNode;
  scrollEnabled?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  asset,
  children,
  scrollEnabled = true,
}) => {
  const { width: winWidth } = useWindowDimensions();

  // On mobile phone screens, fill 100% of the screen width.
  // On desktop / tablet, center a realistic mobile viewport (max 430px wide).
  const isDesktop = winWidth > 480;
  const containerWidth = isDesktop ? Math.min(winWidth, 430) : winWidth;
  const containerHeight = containerWidth * asset.aspectRatio;

  // React Native Web's ScrollView was collapsing the tall reference image on
  // Android browsers. Use normal document flow on web so the image itself
  // defines the complete height, while the interactive layer stays aligned.
  if (Platform.OS === 'web') {
    const imageUri = Image.resolveAssetSource(asset.local).uri;

    return React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          overflowX: 'hidden',
          overflowY: scrollEnabled ? 'auto' : 'hidden',
          backgroundColor: '#14100d',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            margin: '0 auto',
            lineHeight: 0,
          },
        },
        React.createElement('img', {
          src: imageUri,
          alt: asset.name,
          draggable: false,
          style: {
            display: 'block',
            width: '100%',
            height: 'auto',
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              inset: 0,
              lineHeight: 'normal',
            },
          },
          children,
        ),
      ),
    );
  }

  const content = (
    <View
      style={[
        styles.imageContainer,
        {
          width: containerWidth,
          height: containerHeight,
        },
      ]}
    >
      <Image
        source={asset.local}
        style={[
          styles.image,
          { width: containerWidth, height: containerHeight },
        ]}
        resizeMode="contain"
      />
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {scrollEnabled ? (
          <ScrollView
            style={[styles.scrollView, { width: containerWidth }]}
            contentContainerStyle={[
              styles.scrollContent,
              { minHeight: containerHeight },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.fixedView, { width: containerWidth, height: '100%' }]}>
            {content}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#120f0d',
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#14100d',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  fixedView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#120f0d',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
