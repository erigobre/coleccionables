import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChipSelect } from '../ui/ChipSelect';
import { DatePickerField } from '../ui/DatePickerField';
import { TextField } from '../ui/TextField';
import {
  CATEGORY_OPTIONS,
  CONSERVATION_OPTIONS,
  PACKAGING_OPTIONS,
  USAGE_OPTIONS,
  isComicCategory,
} from '../../lib/item-enums';
import type { ItemFormValues } from '../../lib/item-form';
import { colors } from '../../theme/tokens';

interface ItemFormFieldsProps {
  values: ItemFormValues;
  onChange: <K extends keyof ItemFormValues>(field: K, value: ItemFormValues[K]) => void;
}

export function ItemFormFields({ values, onChange }: ItemFormFieldsProps) {
  return (
    <View>
      <TextField
        label="Nombre del objeto *"
        value={values.name}
        onChangeText={(text) => onChange('name', text)}
        placeholder="Ej. Batman: The Killing Joke"
      />

      <ChipSelect
        label="Categoría *"
        options={CATEGORY_OPTIONS}
        value={values.category}
        onChange={(value) => onChange('category', value)}
      />

      <ChipSelect
        label="Condición de empaque *"
        options={PACKAGING_OPTIONS}
        value={values.packagingCondition}
        onChange={(value) => onChange('packagingCondition', value)}
      />

      <ChipSelect
        label="Estado *"
        options={USAGE_OPTIONS}
        value={values.usageState}
        onChange={(value) => onChange('usageState', value)}
      />

      <ChipSelect
        label="Estado de conservación"
        options={CONSERVATION_OPTIONS}
        value={values.conservationState}
        onChange={(value) => onChange('conservationState', value)}
      />

      <TextField label="Marca/Fabricante" value={values.brand} onChangeText={(text) => onChange('brand', text)} />
      <TextField label="Línea de juguete / Modelo" value={values.toyLine} onChangeText={(text) => onChange('toyLine', text)} />
      <TextField label="Edición" value={values.edition} onChangeText={(text) => onChange('edition', text)} placeholder="Ej. Edición limitada" />
      <TextField label="Escala/Altura" value={values.scale} onChangeText={(text) => onChange('scale', text)} placeholder="Ej. 1:6, 30cm" />
      <TextField label="Diseño/Diseñador" value={values.designer} onChangeText={(text) => onChange('designer', text)} />
      <TextField
        label="Año de lanzamiento"
        value={values.releaseYear}
        onChangeText={(text) => onChange('releaseYear', text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />
      <TextField label="Número de set original" value={values.originalSetNumber} onChangeText={(text) => onChange('originalSetNumber', text)} />
      <TextField
        label="Identificador único (SKU/UPC/ISBN)"
        value={values.uniqueIdentifier}
        onChangeText={(text) => onChange('uniqueIdentifier', text)}
      />
      <TextField
        label="Precio de compra (MXN)"
        value={values.purchasePrice}
        onChangeText={(text) => onChange('purchasePrice', text.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
      />
      <TextField label="Lugar de compra" value={values.purchaseLocationText} onChangeText={(text) => onChange('purchaseLocationText', text)} />
      <DatePickerField label="Fecha de adquisición" value={values.acquisitionDate} onChange={(date) => onChange('acquisitionDate', date)} />
      <TextField
        label="Cantidad"
        value={values.quantity}
        onChangeText={(text) => onChange('quantity', text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />

      <Pressable
        onPress={() => onChange('isGift', !values.isGift)}
        className="mb-4 flex-row items-center gap-3 rounded-md border border-border bg-surfaceElevated px-4 py-3"
      >
        <Ionicons
          name={values.isGift ? 'checkbox' : 'square-outline'}
          size={20}
          color={values.isGift ? colors.primary : colors.textMuted}
        />
        <Text className="text-base text-text">Es regalo/herencia</Text>
      </Pressable>

      {isComicCategory(values.category) ? (
        <View className="mb-2">
          <Text className="mb-3 text-sm font-semibold text-text">Datos de cómic/libro</Text>
          <TextField label="Número de cover" value={values.comicCoverNumber} onChangeText={(text) => onChange('comicCoverNumber', text)} />
          <TextField label="Número de issue/volumen" value={values.comicIssueNumber} onChangeText={(text) => onChange('comicIssueNumber', text)} />
          <TextField label="Escritor (guionista)" value={values.comicWriter} onChangeText={(text) => onChange('comicWriter', text)} />
          <TextField label="Dibujante (penciler)" value={values.comicPenciler} onChangeText={(text) => onChange('comicPenciler', text)} />
          <TextField label="Entintor (inker)" value={values.comicInker} onChangeText={(text) => onChange('comicInker', text)} />
          <TextField label="Colorista" value={values.comicColorist} onChangeText={(text) => onChange('comicColorist', text)} />
          <TextField label="Editorial" value={values.comicPublisher} onChangeText={(text) => onChange('comicPublisher', text)} />
        </View>
      ) : null}

      <TextField
        label="Notas"
        value={values.notes}
        onChangeText={(text) => onChange('notes', text)}
        multiline
        numberOfLines={4}
        style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
      />
    </View>
  );
}
