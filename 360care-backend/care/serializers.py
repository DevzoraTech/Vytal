from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Admission, ClinicalNote, ClinicalNoteVersion, LabResult, ModuleAccess, Patient, TriageEntry

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'modules')

    def get_modules(self, obj):
        modules = list(obj.module_accesses.values_list('module_key', flat=True))
        if not modules and (obj.is_superuser or obj.is_staff):
            modules = [choice[0] for choice in ModuleAccess.Module.choices]
        return modules


class ClinicalNoteVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalNoteVersion
        fields = (
            'version_number',
            'change_reason',
            'changed_by_name',
            'changed_by_role',
            'payload',
            'created_at',
        )


class ClinicalNoteSerializer(serializers.ModelSerializer):
    versions = ClinicalNoteVersionSerializer(many=True, read_only=True)
    edit_reason = serializers.CharField(write_only=True, required=False, allow_blank=False)
    edited_by_name = serializers.CharField(write_only=True, required=False, allow_blank=False)
    edited_by_role = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = ClinicalNote
        fields = (
            'id',
            'admission',
            'documented_at',
            'systolic_bp',
            'diastolic_bp',
            'pulse',
            'respiration_rate',
            'temperature_c',
            'oxygen_saturation',
            'treatment_details',
            'treatment_route',
            'complaints',
            'remarks',
            'recorded_by_name',
            'recorded_by_role',
            'versions',
            'edit_reason',
            'edited_by_name',
            'edited_by_role',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('versions', 'created_at', 'updated_at')

    def validate(self, attrs):
        if self.instance:
            missing = [
                field
                for field in ('edit_reason', 'edited_by_name', 'edited_by_role')
                if not attrs.get(field)
            ]
            if missing:
                raise serializers.ValidationError(
                    {field: 'This field is required when editing notes.' for field in missing}
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop('edit_reason', None)
        validated_data.pop('edited_by_name', None)
        validated_data.pop('edited_by_role', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('edit_reason', None)
        validated_data.pop('edited_by_name', None)
        validated_data.pop('edited_by_role', None)
        return super().update(instance, validated_data)


class AdmissionInlineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admission
        exclude = ('patient', 'is_archived', 'created_at', 'updated_at')


class AdmissionSerializer(serializers.ModelSerializer):
    clinical_notes = ClinicalNoteSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Admission
        fields = (
            'id',
            'patient',
            'patient_name',
            'admission_date',
            'discharge_date',
            'provisional_diagnosis',
            'final_diagnosis',
            'treatment_duration',
            'treatment_frequency',
            'lab_tests_done',
            'next_of_kin_name',
            'next_of_kin_contact',
            'allergies',
            'contraindications',
            'status',
            'review_date',
            'clinical_notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('patient_name', 'created_at', 'updated_at')

    def get_patient_name(self, obj):
        return str(obj.patient)


class TriageEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageEntry
        fields = (
            'id',
            'full_name',
            'age',
            'sex',
            'phone_number',
            'arrival_method',
            'email',
            'address',
            'admission_date',
            'contact_name',
            'contact_phone',
            'symptoms',
            'allergies',
            'temperature_c',
            'weight_kg',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class LabResultSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    admission = serializers.PrimaryKeyRelatedField(read_only=True)
    triage_entry = serializers.PrimaryKeyRelatedField(
        queryset=TriageEntry.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    recorded_at = serializers.DateTimeField(required=False, allow_null=True)
    payload = serializers.JSONField(required=False)
    patient_name = serializers.SerializerMethodField()
    admission_id = serializers.IntegerField(source='admission.id', read_only=True)
    triage_entry_id = serializers.IntegerField(source='triage_entry.id', read_only=True)
    recorded_by_name = serializers.CharField(required=False, allow_blank=True)
    recorded_by_role = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = LabResult
        fields = (
            'id',
            'patient',
            'patient_name',
            'admission',
            'admission_id',
            'triage_entry',
            'triage_entry_id',
            'test_type',
            'summary',
            'payload',
            'recorded_at',
            'recorded_by_name',
            'recorded_by_role',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at', 'patient', 'admission')

    def get_patient_name(self, obj):
        return str(obj.patient)


class PatientSerializer(serializers.ModelSerializer):
    admissions = AdmissionSerializer(many=True, read_only=True)
    total_admissions = serializers.SerializerMethodField()
    latest_admission_status = serializers.SerializerMethodField()
    allergy_summary = serializers.SerializerMethodField()
    initial_admission = AdmissionInlineCreateSerializer(
        write_only=True, required=False
    )

    class Meta:
        model = Patient
        fields = (
            'id',
            'first_name',
            'last_name',
            'patient_identifier',
            'age',
            'gender',
            'weight_kg',
            'phone_number',
            'email',
            'address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'notes',
            'total_admissions',
            'latest_admission_status',
            'allergy_summary',
            'admissions',
            'initial_admission',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'total_admissions',
            'latest_admission_status',
            'allergy_summary',
            'admissions',
            'created_at',
            'updated_at',
        )

    def get_total_admissions(self, obj):
        return obj.admissions.filter(is_archived=False).count()

    def get_latest_admission_status(self, obj):
        latest = obj.latest_admission
        return latest.status if latest else None

    def get_allergy_summary(self, obj):
        return obj.allergy_summary()

    def create(self, validated_data):
        admission_data = validated_data.pop('initial_admission', None)
        if not admission_data:
            raise serializers.ValidationError(
                {'initial_admission': 'Initial admission details are required.'}
            )
        patient = super().create(validated_data)
        Admission.objects.create(patient=patient, **admission_data)
        return patient
