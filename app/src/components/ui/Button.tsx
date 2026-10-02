import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { FtCoin } from './FtCoin';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'sale';
  // Si se pasa (incluido 0), agrega la moneda dorada + "<n>FT" (FT en tamaño
  // reducido, tipo superíndice) al final del label.
  ftCost?: number | null;
}

// Alturas/radios/tipografía exactos de docs/01-IDENTIDAD-VISUAL.md §Botones.
const HEIGHT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'h-[52px]',
  secondary: 'h-[52px]',
  destructive: 'h-[52px]',
  sale: 'h-[52px]',
  ghost: 'h-12',
};

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary active:bg-primaryHover',
  secondary: 'bg-secondary active:bg-secondaryHover',
  destructive: 'bg-danger',
  sale: 'bg-sale active:bg-saleHover',
  ghost: 'border-2 border-primary bg-transparent active:bg-surfaceElevated',
};

const TEXT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'text-primaryText',
  secondary: 'text-white',
  destructive: 'text-primaryText',
  sale: 'text-primaryText',
  ghost: 'text-primary',
};

const SPINNER_COLOR: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: colors.primaryText,
  secondary: colors.white,
  destructive: colors.primaryText,
  sale: colors.primaryText,
  ghost: colors.primary,
};

// Bungee (font-display) renderiza visiblemente más grande en Android que en
// iOS al mismo tamaño declarado (métrica de la fuente, no font scaling del
// sistema) — a 17px el label se partía a dos líneas en Android (reportado
// 2026-10-01). allowFontScaling=false además evita que el tamaño de texto
// del sistema del teléfono infle un botón de ancho fijo.
const LABEL_SIZE = Platform.OS === 'android' ? 14 : 17;

export function Button({ label, onPress, loading, disabled, variant = 'primary', ftCost }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${HEIGHT_CLASS[variant]} items-center justify-center rounded-md px-5 ${
        isDisabled ? 'border-0 bg-disabledBg' : VARIANT_CLASS[variant]
      }`}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? colors.disabledText : SPINNER_COLOR[variant]} />
      ) : (
        <View className="flex-row flex-wrap items-center justify-center gap-x-1.5">
          <Text
            allowFontScaling={false}
            style={{ fontSize: LABEL_SIZE }}
            className={`text-center font-display uppercase tracking-wide ${
              isDisabled ? 'text-disabledText' : TEXT_CLASS[variant]
            }`}
          >
            {label}
          </Text>
          {ftCost != null ? (
            <View className="flex-row items-center gap-1">
              <FtCoin size={13} />
              <Text
                className={`font-display text-[14px] ${isDisabled ? 'text-disabledText' : TEXT_CLASS[variant]}`}
              >
                {ftCost}
                <Text style={{ fontSize: 10 }}>FT</Text>
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
