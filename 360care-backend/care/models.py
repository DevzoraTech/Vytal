from django.contrib.auth import get_user_model
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base model adding created/updated timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(is_archived=True)

    def hard_delete(self):
        return super().delete()

    def active(self):
        return self.filter(is_archived=False)


class ActiveManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_archived=False)


class SoftDeleteModel(TimeStampedModel):
    """Adds soft-delete semantics with archived flag."""

    is_archived = models.BooleanField(default=False)

    objects = ActiveManager()
    all_objects = SoftDeleteQuerySet.as_manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_archived = True
        self.save(update_fields=["is_archived", "updated_at"])


class Patient(SoftDeleteModel):
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    patient_identifier = models.CharField(max_length=120, blank=True)
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=30, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    phone_number = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    emergency_contact_name = models.CharField(max_length=120, blank=True)
    emergency_contact_phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("last_name", "first_name")

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"

    @property
    def is_complete(self) -> bool:
        return self.admissions.filter(is_archived=False).exists()

    @property
    def latest_admission(self):
        return (
            self.admissions.filter(is_archived=False)
            .order_by("-admission_date", "-id")
            .first()
        )

    def allergy_summary(self) -> str:
        allergies = (
            self.admissions.filter(is_archived=False)
            .exclude(allergies__exact="")
            .values_list("allergies", flat=True)
        )
        unique = []
        for item in allergies:
            values = [entry.strip() for entry in item.split(",") if entry.strip()]
            for value in values:
                if value not in unique:
                    unique.append(value)
        return ", ".join(unique)


class Admission(SoftDeleteModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISCHARGED = "discharged", "Discharged"
        CLOSED = "closed", "Closed"

    patient = models.ForeignKey(
        Patient, related_name="admissions", on_delete=models.PROTECT
    )
    admission_date = models.DateField()
    discharge_date = models.DateField(null=True, blank=True)
    provisional_diagnosis = models.TextField()
    final_diagnosis = models.TextField(blank=True)
    treatment_duration = models.CharField(max_length=120, blank=True)
    treatment_frequency = models.CharField(max_length=120, blank=True)
    lab_tests_done = models.TextField(blank=True)
    next_of_kin_name = models.CharField(max_length=120)
    next_of_kin_contact = models.CharField(max_length=60)
    allergies = models.TextField(blank=True)
    contraindications = models.TextField(blank=True)
    review_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=32, choices=Status.choices, default=Status.ACTIVE
    )

    class Meta:
        ordering = ("-admission_date", "-id")

    def __str__(self):
        return f"Admission {self.pk} for {self.patient}"

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE and not self.is_archived


class ClinicalNote(SoftDeleteModel):
    admission = models.ForeignKey(
        Admission, related_name="clinical_notes", on_delete=models.PROTECT
    )
    documented_at = models.DateTimeField()
    systolic_bp = models.PositiveIntegerField(null=True, blank=True)
    diastolic_bp = models.PositiveIntegerField(null=True, blank=True)
    pulse = models.PositiveIntegerField(null=True, blank=True)
    respiration_rate = models.PositiveIntegerField(null=True, blank=True)
    temperature_c = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    oxygen_saturation = models.PositiveIntegerField(null=True, blank=True)
    treatment_details = models.TextField()
    treatment_route = models.CharField(max_length=120, blank=True)
    complaints = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    recorded_by_name = models.CharField(max_length=150)
    recorded_by_role = models.CharField(max_length=150)

    class Meta:
        ordering = ("-documented_at", "-id")

    def __str__(self):
        return f"Clinical note {self.pk} for admission {self.admission_id}"

    def snapshot(self) -> dict:
        return {
            "documented_at": self.documented_at.isoformat(),
            "systolic_bp": self.systolic_bp,
            "diastolic_bp": self.diastolic_bp,
            "pulse": self.pulse,
            "respiration_rate": self.respiration_rate,
            "temperature_c": float(self.temperature_c)
            if self.temperature_c is not None
            else None,
            "oxygen_saturation": self.oxygen_saturation,
            "treatment_details": self.treatment_details,
            "treatment_route": self.treatment_route,
            "complaints": self.complaints,
            "remarks": self.remarks,
            "recorded_by_name": self.recorded_by_name,
            "recorded_by_role": self.recorded_by_role,
        }

    def register_version(
        self, *, reason: str, changed_by_name: str, changed_by_role: str
    ):
        ClinicalNoteVersion.objects.create(
            note=self,
            version_number=self.versions.count() + 1,
            payload=self.snapshot(),
            change_reason=reason,
            changed_by_name=changed_by_name,
            changed_by_role=changed_by_role,
        )


class ClinicalNoteVersion(models.Model):
    note = models.ForeignKey(
        ClinicalNote, related_name="versions", on_delete=models.CASCADE
    )
    version_number = models.PositiveIntegerField()
    payload = models.JSONField()
    change_reason = models.CharField(max_length=255)
    changed_by_name = models.CharField(max_length=150)
    changed_by_role = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("note", "version_number")
        ordering = ("-version_number",)

    def __str__(self):
        return f"Note {self.note_id} v{self.version_number}"


User = get_user_model()


class ModuleAccess(models.Model):
    class Module(models.TextChoices):
        DASHBOARD = "dashboard", "Dashboard"
        TRIAGE = "triage", "Triage"
        PATIENTS = "patients", "Patient Management"
        APPOINTMENTS = "appointments", "Appointments & Scheduling"
        BILLING = "billing", "Billing & Finance"
        PHARMACY = "pharmacy", "Pharmacy Management"
        LABORATORY = "laboratory", "Laboratory & Diagnostics"
        INVENTORY = "inventory", "Inventory & Supply Chain"
        REPORTS = "reports", "Reporting & Analytics"
        SUPPORT = "support", "Customer Support"

    user = models.ForeignKey(
        User, related_name="module_accesses", on_delete=models.CASCADE
    )
    module_key = models.CharField(max_length=32, choices=Module.choices)

    class Meta:
        unique_together = ("user", "module_key")
        verbose_name = "Module access"
        verbose_name_plural = "Module access"

    def __str__(self):
        return f"{self.user} · {self.get_module_key_display()}"


class TriageEntry(SoftDeleteModel):
    class Status(models.TextChoices):
        TRIAGE = "triage", "In Triage"
        LAB_DONE = "lab_done", "Lab Completed"
        TREATMENT = "treatment", "Ready for Treatment"
        DISCHARGED = "discharged", "Discharged"

    full_name = models.CharField(max_length=200)
    age = models.PositiveIntegerField(default=0)
    sex = models.CharField(max_length=30, blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    arrival_method = models.CharField(max_length=60, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    admission_date = models.DateField()
    contact_name = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    symptoms = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    temperature_c = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    weight_kg = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(
        max_length=24, choices=Status.choices, default=Status.TRIAGE
    )

    class Meta:
        ordering = ("-admission_date", "-id")

    def __str__(self):
        return f"{self.full_name} ({self.get_status_display()})"


class LabResult(SoftDeleteModel):
    patient = models.ForeignKey(
        Patient, related_name="lab_results", on_delete=models.PROTECT
    )
    admission = models.ForeignKey(
        Admission, related_name="lab_results", on_delete=models.PROTECT
    )
    triage_entry = models.ForeignKey(
        TriageEntry,
        related_name="lab_results",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    test_type = models.CharField(max_length=120)
    summary = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField()
    recorded_by_name = models.CharField(max_length=150)
    recorded_by_role = models.CharField(max_length=150)

    class Meta:
        ordering = ("-recorded_at", "-id")

    def __str__(self):
        return f"{self.test_type} for {self.patient}"
