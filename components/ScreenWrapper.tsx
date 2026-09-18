import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  SafeAreaView,
  Image,
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
        style={styles.image}
        resizeMode="stretch"
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
    ...StyleSheet.absoluteFillObject,
  },
});
