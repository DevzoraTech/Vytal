from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db.models import Prefetch, Q
from django.utils import timezone
from datetime import datetime
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token

from .models import Admission, ClinicalNote, LabResult, Patient, TriageEntry
from .serializers import (
    AdmissionSerializer,
    ClinicalNoteSerializer,
    ClinicalNoteVersionSerializer,
    LabResultSerializer,
    PatientSerializer,
    TriageEntrySerializer,
    UserSerializer,
)


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.none()
    serializer_class = PatientSerializer

    def get_queryset(self):
        queryset = (
            Patient.objects.prefetch_related(
                Prefetch(
                    'admissions',
                    queryset=Admission.objects.filter(is_archived=False)
                    .prefetch_related(
                        Prefetch(
                            'clinical_notes',
                            queryset=ClinicalNote.objects.filter(is_archived=False)
                            .select_related('admission')
                            .prefetch_related('versions'),
                        )
                    )
                    .order_by('-admission_date', '-id'),
                )
            )
            .filter(is_archived=False)
            .order_by('last_name', 'first_name')
        )
        search_term = self.request.query_params.get('q')
        if search_term:
            queryset = queryset.filter(
                Q(first_name__icontains=search_term)
                | Q(last_name__icontains=search_term)
                | Q(phone_number__icontains=search_term)
            )
        return queryset

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            "Patients cannot be deleted. Archive records through governance workflows."
        )


class AdmissionViewSet(viewsets.ModelViewSet):
    queryset = Admission.objects.none()
    serializer_class = AdmissionSerializer

    def get_queryset(self):
        queryset = (
            Admission.objects.filter(is_archived=False)
            .select_related('patient')
            .prefetch_related(
                Prefetch(
                    'clinical_notes',
                    queryset=ClinicalNote.objects.filter(is_archived=False)
                    .select_related('admission')
                    .prefetch_related('versions')
                    .order_by('-documented_at', '-id'),
                )
            )
        )
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset.order_by('-admission_date')

    def destroy(self, request, *args, **kwargs):
        raise ValidationError("Admissions cannot be deleted. Update the status instead.")


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.none()
    serializer_class = ClinicalNoteSerializer

    def get_queryset(self):
        queryset = ClinicalNote.objects.filter(is_archived=False).select_related(
            'admission', 'admission__patient'
        )
        admission_id = self.request.query_params.get('admission')
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
        return queryset.prefetch_related('versions').order_by('-documented_at', '-id')

    def perform_create(self, serializer):
        note = serializer.save()
        note.register_version(
            reason="Initial entry",
            changed_by_name=note.recorded_by_name,
            changed_by_role=note.recorded_by_role,
        )

    def perform_update(self, serializer):
        edit_reason = serializer.validated_data.get('edit_reason')
        edited_by_name = serializer.validated_data.get('edited_by_name')
        edited_by_role = serializer.validated_data.get('edited_by_role')
        if not all([edit_reason, edited_by_name, edited_by_role]):
            raise ValidationError(
                "Editing a note requires edit_reason, edited_by_name, and edited_by_role."
        )
        note = serializer.save()
        note.register_version(
            reason=edit_reason,
            changed_by_name=edited_by_name,
            changed_by_role=edited_by_role,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        note = self.get_object()
        serializer = ClinicalNoteVersionSerializer(note.versions.all(), many=True)
        return Response(serializer.data)


class TriageEntryViewSet(viewsets.ModelViewSet):
    queryset = TriageEntry.objects.none()
    serializer_class = TriageEntrySerializer

    def get_queryset(self):
        queryset = TriageEntry.objects.filter(is_archived=False)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-admission_date', '-id')

    def destroy(self, request, *args, **kwargs):
        raise ValidationError("Triage entries cannot be deleted. Update the status instead.")

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        entry = self.get_object()
        full_name = entry.full_name.strip() or "Patient"
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else "Triage"
        admission_date = entry.admission_date or timezone.now().date()
        patient_payload = {
          'first_name': request.data.get('first_name', first_name),
          'last_name': request.data.get('last_name', last_name),
          'patient_identifier': request.data.get('patient_identifier', ''),
          'age': request.data.get('age', entry.age),
          'gender': request.data.get('gender', entry.sex),
          'weight_kg': request.data.get('weight_kg', entry.weight_kg),
          'phone_number': request.data.get('phone_number', entry.phone_number),
          'email': request.data.get('email', entry.email),
          'address': request.data.get('address', entry.address),
          'emergency_contact_name': request.data.get(
              'emergency_contact_name', entry.contact_name
          ),
          'emergency_contact_phone': request.data.get(
              'emergency_contact_phone', entry.contact_phone
          ),
          'notes': request.data.get('notes', entry.symptoms),
          'initial_admission': {
              'admission_date': request.data.get(
                  'admission_date', admission_date
              ),
              'discharge_date': request.data.get('discharge_date'),
              'review_date': request.data.get('review_date'),
              'provisional_diagnosis': request.data.get(
                  'provisional_diagnosis', entry.symptoms or "Provisional assessment"
              ),
              'final_diagnosis': request.data.get('final_diagnosis', ''),
              'treatment_frequency': request.data.get('treatment_frequency', ''),
              'treatment_duration': request.data.get('treatment_duration', ''),
              'lab_tests_done': request.data.get('lab_tests_done', ''),
              'lab_tests_list': request.data.get('lab_tests_list', []),
              'next_of_kin_name': request.data.get(
                  'next_of_kin_name', entry.contact_name or "Not provided"
              ),
              'next_of_kin_contact': request.data.get(
                  'next_of_kin_contact', entry.contact_phone or ""
              ),
              'allergies': request.data.get('allergies', entry.allergies),
              'contraindications': request.data.get('contraindications', ''),
          },
        }
        serializer = PatientSerializer(data=patient_payload)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        entry.status = TriageEntry.Status.TREATMENT
        entry.save(update_fields=['status', 'updated_at'])
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def _ensure_patient_and_admission_from_triage(entry: TriageEntry):
    full_name = entry.full_name.strip() or "Patient"
    parts = full_name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else "Triage"
    admission_date = entry.admission_date or timezone.now().date()
    patient = Patient.objects.create(
        first_name=first_name,
        last_name=last_name,
        patient_identifier="",
        age=entry.age,
        gender=entry.sex,
        weight_kg=entry.weight_kg,
        phone_number=entry.phone_number or "",
        email=entry.email or "",
        address=entry.address or "",
        emergency_contact_name=entry.contact_name or "",
        emergency_contact_phone=entry.contact_phone or "",
        notes=entry.symptoms or "",
    )
    admission = Admission.objects.create(
        patient=patient,
        admission_date=admission_date,
        discharge_date=None,
        provisional_diagnosis=entry.symptoms or "Provisional assessment",
        final_diagnosis="",
        treatment_duration="",
        treatment_frequency="",
        lab_tests_done="",
        next_of_kin_name=entry.contact_name or "",
        next_of_kin_contact=entry.contact_phone or "",
        allergies=entry.allergies or "",
        contraindications="",
        review_date=None,
        status=Admission.Status.ACTIVE,
    )
    return patient, admission


class LabQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = (
            TriageEntry.objects.filter(is_archived=False, status=TriageEntry.Status.TRIAGE)
            .order_by('-admission_date', '-id')
        )
        serializer = TriageEntrySerializer(entries, many=True)
        return Response(serializer.data)


class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.none()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LabResult.objects.filter(is_archived=False).select_related(
            'patient', 'admission', 'triage_entry'
        )
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset.order_by('-recorded_at', '-id')

    def perform_create(self, serializer):
        data = self.request.data
        triage_entry_id = data.get('triage_entry')
        patient_id = data.get('patient')
        admission_id = data.get('admission')
        triage_entry = None
        patient = None
        admission = None
        recorded_by_name = data.get('recorded_by_name') or self.request.user.get_full_name() or self.request.user.username
        recorded_by_role = data.get('recorded_by_role') or "Laboratory"

        if triage_entry_id:
            triage_entry = TriageEntry.objects.filter(id=triage_entry_id).first()
        if patient_id:
            patient = Patient.objects.filter(id=patient_id).first()
        if admission_id:
            admission = Admission.objects.filter(id=admission_id).first()

        if triage_entry and not patient:
            patient, admission = _ensure_patient_and_admission_from_triage(triage_entry)
        if triage_entry and patient and not admission:
            admission = Admission.objects.create(
                patient=patient,
                admission_date=triage_entry.admission_date or timezone.now().date(),
                discharge_date=None,
                provisional_diagnosis=triage_entry.symptoms or "Provisional assessment",
                final_diagnosis="",
                treatment_duration="",
                treatment_frequency="",
                lab_tests_done="",
                next_of_kin_name=triage_entry.contact_name or "",
                next_of_kin_contact=triage_entry.contact_phone or "",
                allergies=triage_entry.allergies or "",
                contraindications="",
                review_date=None,
                status=Admission.Status.ACTIVE,
            )
        if not patient or not admission:
            raise ValidationError("Patient and admission are required to record lab results.")

        recorded_at_raw = data.get('recorded_at')
        recorded_at_value = timezone.now()
        if recorded_at_raw:
            try:
                recorded_at_value = datetime.fromisoformat(
                    str(recorded_at_raw).replace("Z", "+00:00")
                )
            except Exception:
                recorded_at_value = timezone.now()

        lab_result = serializer.save(
            patient=patient,
            admission=admission,
            triage_entry=triage_entry,
            recorded_by_name=recorded_by_name,
            recorded_by_role=recorded_by_role,
            recorded_at=recorded_at_value,
        )

        ClinicalNote.objects.create(
            admission=admission,
            documented_at=lab_result.recorded_at,
            systolic_bp=None,
            diastolic_bp=None,
            pulse=None,
            respiration_rate=None,
            temperature_c=None,
            oxygen_saturation=None,
            treatment_details=f"Lab ({lab_result.test_type}): {lab_result.summary}",
            treatment_route="Lab",
            complaints="",
            remarks="",
            recorded_by_name=recorded_by_name,
            recorded_by_role=recorded_by_role,
        )

        if lab_result.summary:
            current = admission.lab_tests_done or ""
            separator = "\n" if current else ""
            admission.lab_tests_done = f"{current}{separator}{lab_result.test_type}: {lab_result.summary}"
            admission.save(update_fields=['lab_tests_done', 'updated_at'])

        if triage_entry:
            triage_entry.status = TriageEntry.Status.LAB_DONE
            triage_entry.save(update_fields=['status', 'updated_at'])


User = get_user_model()


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response(
                {'detail': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {'detail': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST
            )
        if not user.is_active:
            return Response(
                {'detail': 'User account is disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        return Response({'token': token.key, 'user': serializer.data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
