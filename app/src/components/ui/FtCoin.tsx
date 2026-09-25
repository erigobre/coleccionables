import { View } from 'react-native';

interface FtCoinProps {
  size?: number;
}

// Insignia de moneda FrikiToken hecha con Views planas (no el emoji 🪙): en iOS
// Apple lo renderiza plateado/gris y en Android Google lo renderiza dorado, así
// que el emoji se ve inconsistente entre plataformas. Con Views el dorado es
// idéntico en ambas.
export function FtCoin({ size = 14 }: FtCoinProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#B8860B',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: (size * 0.78) / 2,
          backgroundColor: '#F4C430',
        }}
      />
    </View>
  );
}
