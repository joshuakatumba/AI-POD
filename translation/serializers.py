from translation.models import Translation
from rest_framework import serializers


class TranslationReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Translation
        fields = [
            "id",
            "reference",
            "field_name",
            "source_language",
            "target_language",
			"original_text",
			"intended_text",
            "translated_text",
            "created_at",
            "created_at",
		]
