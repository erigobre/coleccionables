import { Image, Text, View } from 'react-native';

type Size = 'sm' | 'md';

const SIZES: Record<Size, { icon: number; title: number }> = {
  sm: { icon: 30, title: 18 },
  md: { icon: 40, title: 22 },
};

export function LogoHorizontal({ size = 'sm' }: { size?: Size }) {
  const { icon, title } = SIZES[size];
  return (
    <View className="flex-row items-center gap-2.5">
      <Image source={require('../../../assets/icon.png')} style={{ width: icon, height: icon, borderRadius: icon * 0.23 }} />
      <View>
        <Text className="font-display text-text" style={{ fontSize: title }}>
          FRIKI<Text className="text-primary">DEX</Text>
        </Text>
        <Text className="text-[9px] uppercase tracking-widest text-textMuted">La dex de tus coleccionables</Text>
      </View>
    </View>
  );
}
