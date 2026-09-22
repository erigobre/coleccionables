import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

// expo-router (SDK 57, "js-tabs" era) doesn't export BottomTabBarProps publicly
// anymore, so we type only the shape this component actually consumes.
interface TabBarRoute {
  key: string;
  name: string;
}

interface TabBarProps {
  state: { index: number; routes: TabBarRoute[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  insets: { bottom: number };
}

const TAB_META: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: 'home', inactive: 'home-outline', label: 'Home' },
  colecciones: { active: 'albums', inactive: 'albums-outline', label: 'Colecciones' },
  objetos: { active: 'cube', inactive: 'cube-outline', label: 'Objetos' },
  wishlist: { active: 'heart', inactive: 'heart-outline', label: 'Wishlist' },
  perfil: { active: 'person', inactive: 'person-outline', label: 'Perfil' },
};

// Pantallas de cámara a pantalla completa: aquí la barra flotante taparía el
// disparador y los botones de abajo, así que se oculta mientras están activas.
const ROUTES_WITHOUT_TAB_BAR = new Set(['captura', 'ya-lo-tengo']);

// El tab "objetos" es en realidad un Stack anidado; hay que mirar su ruta
// interna activa (no solo el nombre del tab) para saber si hay que ocultar la barra.
function getFocusedLeafRouteName(route: TabBarRoute & { state?: { index: number; routes: TabBarRoute[] } }): string {
  let current: TabBarRoute & { state?: { index: number; routes: TabBarRoute[] } } = route;
  while (current.state) {
    current = current.state.routes[current.state.index] as typeof current;
  }
  return current.name;
}

export function GlassTabBar({ state, navigation, insets }: TabBarProps) {
  const focusedRoute = state.routes[state.index];
  const focusedLeafName = getFocusedLeafRouteName(focusedRoute as Parameters<typeof getFocusedLeafRouteName>[0]);
  if (ROUTES_WITHOUT_TAB_BAR.has(focusedLeafName)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 8 }}
    >
      <BlurView
        intensity={60}
        tint="dark"
        style={{
          flexDirection: 'row',
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(198,244,50,0.18)',
          backgroundColor: 'rgba(34,28,61,0.75)',
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? TAB_META.index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} className="flex-1 items-center justify-center py-3">
              <Ionicons name={isFocused ? meta.active : meta.inactive} size={22} color={isFocused ? colors.primary : colors.textMuted} />
              <Text className="font-body-medium mt-1 text-[11px]" style={{ color: isFocused ? colors.primary : colors.textMuted }}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
