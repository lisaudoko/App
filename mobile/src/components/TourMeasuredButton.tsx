import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTourStore } from '@/store/tourStore';

/**
 * Wraps a coach tab bar button purely to report its on-screen position to
 * tourStore for AppTour's spotlight cutout — otherwise renders exactly what
 * the tab navigator would have (icon/label passed in as `children`, same
 * press handling), so it's a no-op visually outside of the tour.
 *
 * `props` is intentionally untyped: it's whatever the tab navigator's
 * `tabBarButton` render prop hands us (BottomTabBarButtonProps), and the only
 * fields used here are read off it below rather than re-declared.
 */
export function TourMeasuredButton({ tabKey, ...props }: any) {
  const viewRef = useRef<View>(null);
  const reportTabLayout = useTourStore((s) => s.reportTabLayout);

  return (
    <Pressable
      ref={viewRef}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      style={props.style}
      onLayout={() => {
        viewRef.current?.measureInWindow((x, y, width, height) => reportTabLayout(tabKey, { x, y, width, height }));
      }}
    >
      {props.children}
    </Pressable>
  );
}
