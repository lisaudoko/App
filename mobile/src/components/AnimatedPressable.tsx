import React, { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { MotiView } from 'moti';

interface Props extends Omit<PressableProps, 'children'> {
  children: ReactNode;
}

export function AnimatedPressable({ children, style, ...props }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={style} {...props}>
      <MotiView animate={{ scale: pressed ? 0.96 : 1 }} transition={{ type: 'timing', duration: 100 }}>
        {children}
      </MotiView>
    </Pressable>
  );
}
