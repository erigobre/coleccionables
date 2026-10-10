import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../components/GlassTabBar';
import { colors } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="colecciones" />
      <Tabs.Screen name="objetos" />
      <Tabs.Screen name="wishlist" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
