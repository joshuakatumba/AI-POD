export type TranslationType = {
  id: string;
  reference: string;
  field_name: string; 
  source_language: string;
  target_language: string;
  original_text: string;
  translated_text: string;
  intended_text?: string;
  created_at?: string;
  updated_at?: string;
};
