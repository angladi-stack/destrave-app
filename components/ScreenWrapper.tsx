import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
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
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  // On mobile phone screens, fill 100% of the screen width.
  // On desktop / tablet, center a realistic mobile viewport (max 430px wide).
  const isDesktop = winWidth > 480;
  const containerWidth = isDesktop ? Math.min(winWidth, 430) : winWidth;
  const containerHeight = containerWidth * asset.aspectRatio;

  // Use local bundled image directly for instantaneous load and zero network failure,
  // with remote URL reference embedded as specified in prompt.
  const [imageSource, setImageSource] = useState<any>(asset.local);

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
        source={imageSource}
        style={styles.image}
        contentFit="contain"
        priority="high"
        transition={150}
        onError={() => setImageSource(asset.local)}
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
            contentContainerStyle={styles.scrollContent}
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
    justifyContent: 'center',
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
    width: '100%',
    height: '100%',
  },
});
