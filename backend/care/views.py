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

from .models import (
    Admission,
    CarePlan,
    ClinicalNote,
    ConsultationEvent,
    ConsultationTask,
    LabOrder,
    LabResult,
    Patient,
    TriageEntry,
)
from .serializers import (
    AdmissionSerializer,
    CarePlanSerializer,
    ClinicalNoteSerializer,
    ClinicalNoteVersionSerializer,
    ConsultationEncounterSerializer,
    ConsultationEventSerializer,
    ConsultationTaskSerializer,
    LabOrderSerializer,
    LabResultSerializer,
    PatientSerializer,
    TriageEntrySerializer,
    UserSerializer,
)

def _generate_patient_identifier() -> str:
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
    return f"{prefix}{letter}{number:04d}"


def _get_or_create_patient_and_admission_from_triage(entry: TriageEntry):
    patient = None
    if entry.phone_number:
        patient = (
            Patient.objects.filter(phone_number=entry.phone_number, is_archived=False)
            .order_by('-id')
            .first()
        )
    if not patient:
        full_name = entry.full_name.strip() or "Patient"
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else "Triage"
        patient = Patient.objects.create(
            first_name=first_name,
            last_name=last_name,
            patient_identifier=_generate_patient_identifier(),
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
    admission = (
        Admission.objects.filter(
            patient=patient, status=Admission.Status.ACTIVE, is_archived=False
        )
        .order_by('-admission_date', '-id')
        .first()
    )
    if not admission:
        admission_date = entry.admission_date or timezone.now().date()
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

User = get_user_model()


def _latest_care_plan(admission: Admission):
    return (
        CarePlan.objects.filter(admission=admission, is_archived=False)
        .order_by('-version')
        .first()
    )


def _latest_lab_result(admission: Admission):
    return (
        LabResult.objects.filter(admission=admission, is_archived=False)
        .order_by('-recorded_at', '-id')
        .first()
    )


def _compute_consultation_status(admission: Admission) -> str:
    latest_plan = _latest_care_plan(admission)
    latest_result = _latest_lab_result(admission)
    if not latest_plan:
        if latest_result:
            return "results_available"
        return "awaiting_consult"
    if latest_plan.status == CarePlan.Status.DRAFT:
        return "plan_pending"
    if latest_result and latest_plan.created_at < latest_result.recorded_at:
        return "results_available"
    return "plan_finalized"


def _serialize_worklist_entry(admission: Admission) -> dict:
    latest_plan = _latest_care_plan(admission)
    latest_result = _latest_lab_result(admission)
    status = _compute_consultation_status(admission)
    last_activity = admission.updated_at
    if latest_result and latest_result.recorded_at > last_activity:
        last_activity = latest_result.recorded_at
    if latest_plan and latest_plan.created_at > last_activity:
        last_activity = latest_plan.created_at
    patient = admission.patient
    return {
        "admission_id": admission.id,
        "patient_id": patient.id,
        "patient_name": str(patient),
        "age": patient.age,
        "gender": patient.gender,
        "status": status,
        "latest_lab_result_at": latest_result.recorded_at if latest_result else None,
        "latest_care_plan_version": latest_plan.version if latest_plan else None,
        "latest_care_plan_status": latest_plan.status if latest_plan else None,
        "last_activity_at": last_activity,
    }


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

    def perform_create(self, serializer):
        user = self.request.user
        recorded_by_name = user.get_full_name() or user.username
        serializer.save(recorded_by_name=recorded_by_name, recorded_by_role="Triage")

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
        admission = getattr(patient, "latest_admission", None)
        if admission:
            ClinicalNote.objects.create(
                admission=admission,
                documented_at=timezone.now(),
                systolic_bp=None,
                diastolic_bp=None,
                pulse=None,
                respiration_rate=None,
                temperature_c=entry.temperature_c,
                oxygen_saturation=None,
                treatment_details=entry.symptoms or "Triage assessment",
                treatment_route="Triage",
                complaints=entry.symptoms or "",
                remarks="",
                recorded_by_name=self.request.user.get_full_name()
                or self.request.user.username,
                recorded_by_role="Triage",
            )
            ConsultationEvent.objects.create(
                admission=admission,
                event_type="triage_escalated",
                payload={"triage_entry_id": entry.id},
                occurred_at=timezone.now(),
                actor_name=self.request.user.get_full_name()
                or self.request.user.username,
                actor_role="Triage",
            )
            ConsultationTask.objects.create(
                admission=admission,
                task_type=ConsultationTask.TaskType.ACK_REQUIRED,
                target_role="lab",
                message="New triage encounter ready for lab review",
                created_by=self.request.user,
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def _ensure_patient_and_admission_from_triage(entry: TriageEntry):
    return _get_or_create_patient_and_admission_from_triage(entry)


class LabQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = (
            TriageEntry.objects.filter(
                is_archived=False,
                status__in=[TriageEntry.Status.TRIAGE, TriageEntry.Status.TREATMENT],
            )
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
        admission_id = self.request.query_params.get('admission')
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
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
            created_by=self.request.user,
            admission_reference=str(admission.id),
        )
        if lab_result.lab_order_id:
            LabOrder.objects.filter(id=lab_result.lab_order_id).update(
                status=LabOrder.Status.COMPLETED, updated_at=timezone.now()
            )
            ConsultationEvent.objects.create(
                admission=admission,
                event_type="lab_order_completed",
                payload={
                    "order_id": lab_result.lab_order_id,
                    "result_id": lab_result.id,
                    "test_type": lab_result.test_type,
                },
                occurred_at=recorded_at_value,
                actor_name=recorded_by_name,
                actor_role=recorded_by_role or "Laboratory",
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
        ConsultationEvent.objects.create(
            admission=admission,
            event_type="lab_result_recorded",
            payload={
                "result_id": lab_result.id,
                "test_type": lab_result.test_type,
                "lab_order": lab_result.lab_order_id,
                "status": lab_result.status,
            },
            occurred_at=lab_result.recorded_at,
            actor_name=recorded_by_name,
            actor_role=recorded_by_role or "Laboratory",
        )


class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.none()
    serializer_class = LabOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LabOrder.objects.filter(is_archived=False).select_related(
            'admission', 'admission__patient', 'triage_entry', 'ordered_by'
        )
        admission_id = self.request.query_params.get('admission')
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-created_at', '-id')

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user, created_by=self.request.user)
        order = serializer.instance
        if order.status == LabOrder.Status.DRAFT:
            order.status = LabOrder.Status.SUBMITTED
            order.save(update_fields=['status', 'updated_at'])
        ConsultationEvent.objects.create(
            admission=order.admission,
            event_type="lab_order_created",
            payload={
                "order_id": order.id,
                "priority": order.priority,
                "items": order.order_items,
            },
            occurred_at=timezone.now(),
            actor_name=self.request.user.get_full_name()
            or self.request.user.username,
            actor_role="Clinician",
        )
        ConsultationTask.objects.create(
            admission=order.admission,
            lab_order=order,
            task_type=ConsultationTask.TaskType.RESULTS_READY,
            target_role="lab",
            message="New lab order submitted",
            created_by=self.request.user,
        )


class CarePlanViewSet(viewsets.ModelViewSet):
    queryset = CarePlan.objects.none()
    serializer_class = CarePlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = CarePlan.objects.filter(is_archived=False).select_related(
            'admission', 'authored_by', 'supersedes'
        )
        admission_id = self.request.query_params.get('admission')
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
        return queryset.order_by('-version')

    def perform_create(self, serializer):
        plan = serializer.save(
            authored_by=self.request.user, created_by=self.request.user
        )
        ConsultationEvent.objects.create(
            admission=plan.admission,
            event_type="care_plan_created",
            payload={"plan_id": plan.id, "status": plan.status},
            occurred_at=timezone.now(),
            actor_name=self.request.user.get_full_name()
            or self.request.user.username,
            actor_role="Clinician",
        )
        if plan.status == CarePlan.Status.FINALIZED:
            ConsultationTask.objects.create(
                admission=plan.admission,
                care_plan=plan,
                task_type=ConsultationTask.TaskType.NEW_PLAN,
                target_role="nursing",
                message="New care plan finalized",
                created_by=self.request.user,
            )

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        plan = self.get_object()
        plan.status = CarePlan.Status.FINALIZED
        plan.save(update_fields=['status', 'updated_at'])
        ConsultationTask.objects.create(
            admission=plan.admission,
            care_plan=plan,
            task_type=ConsultationTask.TaskType.NEW_PLAN,
            target_role="nursing",
            message="New care plan finalized",
            created_by=request.user,
        )
        return Response(self.get_serializer(plan).data)


class ConsultationTaskViewSet(viewsets.ModelViewSet):
    queryset = ConsultationTask.objects.none()
    serializer_class = ConsultationTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ConsultationTask.objects.filter(is_archived=False).select_related(
            'admission', 'care_plan', 'lab_order', 'acknowledged_by'
        )
        admission_id = self.request.query_params.get('admission')
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        target_role = self.request.query_params.get('target_role')
        if target_role:
            queryset = queryset.filter(target_role__iexact=target_role)
        return queryset.order_by('-created_at', '-id')

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        task = self.get_object()
        task.status = ConsultationTask.Status.ACKNOWLEDGED
        task.acknowledged_at = timezone.now()
        task.acknowledged_by = request.user
        task.save(update_fields=['status', 'acknowledged_at', 'acknowledged_by', 'updated_at'])
        return Response(self.get_serializer(task).data)


class ConsultationEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ConsultationEvent.objects.none()
    serializer_class = ConsultationEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ConsultationEvent.objects.filter(is_archived=False).select_related(
            'admission'
        )
        admission_id = self.request.query_params.get('admission')
        if admission_id:
            queryset = queryset.filter(admission_id=admission_id)
        return queryset.order_by('-occurred_at', '-id')


class ConsultationWorklistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        filter_key = request.query_params.get('filter')
        mine = request.query_params.get('mine') == 'true'
        admissions = Admission.objects.filter(is_archived=False).select_related('patient')
        if filter_key in ('awaiting_consult', 'results_to_review', 'active', 'assigned_to_me'):
            # base set limited to active admissions for worklists
            admissions = admissions.filter(status=Admission.Status.ACTIVE)
        entries = []
        for admission in admissions:
            entry = _serialize_worklist_entry(admission)
            status = entry["status"]
            if filter_key == 'awaiting_consult' and status != "awaiting_consult":
                continue
            if filter_key == 'awaiting_consult':
                # extra guard: if any lab result exists, don't keep it in awaiting_consult
                if LabResult.objects.filter(admission=admission, is_archived=False).exists():
                    continue
            if filter_key == 'results_to_review' and status != "results_available":
                continue
            if filter_key == 'active' and status not in (
                "awaiting_consult",
                "results_available",
                "plan_pending",
                "plan_finalized",
            ):
                continue
            if mine:
                latest_plan = _latest_care_plan(admission)
                if not latest_plan or latest_plan.authored_by_id != request.user.id:
                    continue
            entries.append(entry)
        serializer = ConsultationEncounterSerializer(entries, many=True)
        return Response(serializer.data)


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
