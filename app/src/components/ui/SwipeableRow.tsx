import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radius } from '../../theme/tokens';

export interface SwipeAction {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  background: string;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
}

const ACTION_WIDTH = 64;

function ActionButton({ action }: { action: SwipeAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      disabled={action.disabled}
      accessibilityLabel={action.label}
      style={{ width: ACTION_WIDTH, backgroundColor: action.background, opacity: action.disabled ? 0.5 : 1 }}
      className="items-center justify-center gap-1"
    >
      <Ionicons name={action.icon} size={20} color={action.iconColor} />
      <Text style={{ color: action.iconColor, fontSize: 10 }} numberOfLines={1}>
        {action.label}
      </Text>
    </Pressable>
  );
}

interface SwipeableRowProps {
  // Reveladas arrastrando la tarjeta hacia la izquierda (aparecen del lado derecho).
  leftActions?: SwipeAction[];
  // Reveladas arrastrando la tarjeta hacia la derecha (aparecen del lado izquierdo).
  rightActions?: SwipeAction[];
  children: React.ReactNode;
}

export function SwipeableRow({ leftActions = [], rightActions = [], children }: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const maxLeft = leftActions.length * ACTION_WIDTH;
  const maxRight = rightActions.length * ACTION_WIDTH;

  const close = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20 });
  }, [translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const next = startX.value + event.translationX;
      translateX.value = Math.max(-maxLeft, Math.min(maxRight, next));
    })
    .onEnd(() => {
      if (maxLeft > 0 && translateX.value <= -maxLeft / 2) {
        translateX.value = withSpring(-maxLeft, { damping: 20 });
      } else if (maxRight > 0 && translateX.value >= maxRight / 2) {
        translateX.value = withSpring(maxRight, { damping: 20 });
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (maxLeft === 0 && maxRight === 0) return <>{children}</>;

  return (
    // Debe calzar con el rounded-xl de ItemCard (radius.card = 24, el tema
    // redefine la escala de Tailwind) — si no coinciden, las esquinas cuadradas
    // de los botones de abajo se asoman en las esquinas redondeadas de la card.
    <View style={{ overflow: 'hidden', borderRadius: radius.card }}>
      {maxLeft > 0 ? (
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', justifyContent: 'flex-end' }]}>
          {leftActions.map((action) => (
            <ActionButton
              key={action.key}
              action={{
                ...action,
                onPress: () => {
                  close();
                  action.onPress();
                },
              }}
            />
          ))}
        </View>
      ) : null}
      {maxRight > 0 ? (
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', justifyContent: 'flex-start' }]}>
          {rightActions.map((action) => (
            <ActionButton
              key={action.key}
              action={{
                ...action,
                onPress: () => {
                  close();
                  action.onPress();
                },
              }}
            />
          ))}
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
