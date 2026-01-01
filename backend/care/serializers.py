from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Admission,
    CarePlan,
    ClinicalNote,
    ClinicalNoteVersion,
    ConsultationEvent,
    ConsultationTask,
    LabOrder,
    LabResult,
    ModuleAccess,
    Patient,
    TriageEntry,
)

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
            'recorded_by_name',
            'recorded_by_role',
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
    patient_identifier = serializers.SerializerMethodField()
    admission_id = serializers.IntegerField(source='admission.id', read_only=True)
    triage_entry_id = serializers.IntegerField(source='triage_entry.id', read_only=True)
    recorded_by_name = serializers.CharField(required=False, allow_blank=True)
    recorded_by_role = serializers.CharField(required=False, allow_blank=True)
    lab_order = serializers.PrimaryKeyRelatedField(
        queryset=LabOrder.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabResult
        fields = (
            'id',
            'patient',
            'patient_name',
            'patient_identifier',
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
            'status',
            'lab_order',
            'admission_reference',
            'created_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at', 'patient', 'admission')

    def get_patient_name(self, obj):
        return str(obj.patient)

    def get_patient_identifier(self, obj):
        return getattr(obj.patient, "patient_identifier", None)


class LabOrderSerializer(serializers.ModelSerializer):
    admission = serializers.PrimaryKeyRelatedField(
        queryset=Admission.objects.filter(is_archived=False)
    )
    triage_entry = serializers.PrimaryKeyRelatedField(
        queryset=TriageEntry.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    ordered_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    patient_id = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    patient_identifier = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabOrder
        fields = (
            'id',
            'admission',
            'triage_entry',
            'ordered_by',
            'patient_id',
            'patient_name',
            'patient_identifier',
            'created_by',
            'status',
            'priority',
            'order_items',
            'clinical_question',
            'notes_to_lab',
            'policy_bypass',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def get_patient_id(self, obj):
        return obj.admission.patient_id if obj.admission_id else None

    def get_patient_name(self, obj):
        patient = getattr(obj, "admission", None)
        if patient and patient.patient_id:
            return str(patient.patient)
        return None

    def get_patient_identifier(self, obj):
        if obj.admission_id and obj.admission.patient_id:
            return obj.admission.patient.patient_identifier
        return None


class CarePlanSerializer(serializers.ModelSerializer):
    admission = serializers.PrimaryKeyRelatedField(
        queryset=Admission.objects.filter(is_archived=False)
    )
    authored_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    supersedes = serializers.PrimaryKeyRelatedField(
        queryset=CarePlan.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CarePlan
        fields = (
            'id',
            'admission',
            'authored_by',
            'status',
            'version',
            'supersedes',
            'assessment',
            'plan_items',
            'next_review_at',
            'escalation_criteria',
            'note',
            'created_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('version', 'created_at', 'updated_at')

    def validate(self, attrs):
        plan_items = attrs.get('plan_items', {}) or {}
        if 'treatment_schedule' in plan_items:
            schedule = plan_items['treatment_schedule']
            if not isinstance(schedule, list):
                raise serializers.ValidationError(
                    {'plan_items': 'treatment_schedule must be a list.'}
                )
            for item in schedule:
                required = ['date', 'time', 'duration', 'activity']
                missing = [f for f in required if f not in item]
                if missing:
                    raise serializers.ValidationError(
                        {'plan_items': f'Schedule item missing fields: {", ".join(missing)}'}
                    )
        return attrs

    def create(self, validated_data):
        admission = validated_data['admission']
        latest_version = (
            CarePlan.objects.filter(admission=admission, is_archived=False)
            .order_by('-version')
            .values_list('version', flat=True)
            .first()
        )
        validated_data['version'] = (latest_version or 0) + 1
        return super().create(validated_data)


class ConsultationTaskSerializer(serializers.ModelSerializer):
    admission = serializers.PrimaryKeyRelatedField(
        queryset=Admission.objects.filter(is_archived=False)
    )
    care_plan = serializers.PrimaryKeyRelatedField(
        queryset=CarePlan.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    lab_order = serializers.PrimaryKeyRelatedField(
        queryset=LabOrder.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    acknowledged_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ConsultationTask
        fields = (
            'id',
            'admission',
            'care_plan',
            'lab_order',
            'task_type',
            'target_role',
            'status',
            'message',
            'acknowledged_at',
            'acknowledged_by',
            'created_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('acknowledged_at', 'created_at', 'updated_at')


class ConsultationEventSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ConsultationEvent
        fields = (
            'id',
            'admission',
            'event_type',
            'payload',
            'occurred_at',
            'actor_name',
            'actor_role',
            'created_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class ConsultationEncounterSerializer(serializers.Serializer):
    admission_id = serializers.IntegerField()
    patient_id = serializers.IntegerField()
    patient_name = serializers.CharField()
    age = serializers.IntegerField()
    gender = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    latest_lab_result_at = serializers.DateTimeField(allow_null=True)
    latest_care_plan_version = serializers.IntegerField(allow_null=True)
    latest_care_plan_status = serializers.CharField(allow_null=True)
    last_activity_at = serializers.DateTimeField()


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
            'next_treatment',
            'admissions',
            'initial_admission',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'total_admissions',
            'latest_admission_status',
            'allergy_summary',
            'next_treatment',
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

    def get_next_treatment(self, obj):
        from django.utils import timezone
        latest_admission = obj.latest_admission
        if not latest_admission:
            return {'date': '2025-01-01', 'time': '00:00', 'activity': 'DEBUG: No Admission', 'status': 'pending', 'care_plan_id': 0}
        
        # Get latest care plan
        care_plan = CarePlan.objects.filter(
            admission=latest_admission, 
            is_archived=False
        ).order_by('-created_at').first()

        if not care_plan:
             return {'date': '2025-01-01', 'time': '00:00', 'activity': f'DEBUG: No Plan (Adm {latest_admission.id})', 'status': 'pending', 'care_plan_id': 0}

        schedule = care_plan.plan_items.get('treatment_schedule', [])
        if not isinstance(schedule, list):
             return {'date': '2025-01-01', 'time': '00:00', 'activity': 'DEBUG: Schedule not list', 'status': 'pending', 'care_plan_id': 0}

        now_date = timezone.now().date().isoformat()
        
        # Find next pending item
        # We sort by date/time just in case, though they entered order matters
        # Filter for items >= today and status != 'done'
        
        # Simple helper to sort
        def get_sort_key(item):
            return f"{item.get('date')}T{item.get('time', '00:00')}"

        future_items = []
        for item in schedule:
            s_date = item.get('date')
            status = item.get('status', 'pending')
            # Check logic: NOT completed/missed (allow past dates as 'overdue')
            # Note: Frontend uses 'completed' or 'pending'.
            if s_date and status not in ('completed', 'missed', 'done'):
                future_items.append(item)
        
        future_items.sort(key=get_sort_key)
        
        if future_items:
            next_item = future_items[0]
            return {
                'care_plan_id': care_plan.id,
                'date': next_item.get('date'),
                'time': next_item.get('time'),
                'activity': next_item.get('activity'),
                'status': next_item.get('status', 'pending')
            }
        
        return {'date': '2025-01-01', 'time': '00:00', 'activity': f'DEBUG: 0 Pending (Total {len(schedule)})', 'status': 'pending', 'care_plan_id': 0}

    def create(self, validated_data):
        admission_data = validated_data.pop('initial_admission', None)
        if not admission_data:
            raise serializers.ValidationError(
                {'initial_admission': 'Initial admission details are required.'}
            )
        if not validated_data.get('patient_identifier'):
            prefix = "PM"
            last_patient = (
                Patient.objects.filter(patient_identifier__startswith=prefix)
                .exclude(patient_identifier="")
                .order_by('-patient_identifier')
                .first()
            )
            letter = "A"
            number = 1
            if last_patient:
                pid = last_patient.patient_identifier.upper()
                if len(pid) >= 4:
                    letter = pid[2] if pid[2].isalpha() else "A"
                    try:
                        number = int(pid[3:]) + 1
                    except ValueError:
                        number = 1
                    if number > 9999:
                        number = 1
                        letter = chr(ord(letter) + 1) if letter != "Z" else "A"
            validated_data['patient_identifier'] = f"{prefix}{letter}{number:04d}"
        patient = super().create(validated_data)
        Admission.objects.create(patient=patient, **admission_data)
        return patient
