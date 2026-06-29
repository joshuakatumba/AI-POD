import { TranslationType } from "@/_types/translations";

type TranslatableItem = {
  id: string;
  generated_text: string;
};

const TRANSLATABLE_FIELDS = ['generated_text'] as const;
type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

const FIELD_MAP: Record<string, TranslatableField> = {};

function getItemTranslations(
  translations: TranslationType[],
  language: string
): TranslationType[] {
  return translations.filter(
    (t) => t.target_language === language
  );
}

function isTranslatableField(field: unknown): field is TranslatableField {
  return TRANSLATABLE_FIELDS.includes(field as TranslatableField);
}

export function applyTranslations<Item extends TranslatableItem>(
  item: Item,
  translations: TranslationType[],
  selectedLanguage: string
): Item {
  if (!item?.id || !selectedLanguage) return item;

  const translatedItem = { ...item };
  const itemTranslations = getItemTranslations(translations, selectedLanguage);

  itemTranslations.forEach((translation) => {
    if (!translation.translated_text) return;

    const mappedField = FIELD_MAP[translation.field_name] || translation.field_name;

    if (isTranslatableField(mappedField)) {
      (translatedItem as any)[mappedField] = translation.translated_text;
    }
  });

  return translatedItem;
}