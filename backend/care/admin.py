from django.contrib import admin

from .models import (
    Admission,
    ClinicalNote,
    ClinicalNoteVersion,
    ModuleAccess,
    Patient,
)


class AdmissionInline(admin.TabularInline):
    model = Admission
    extra = 0
    fields = ('admission_date', 'status', 'provisional_diagnosis')
    readonly_fields = ('status',)


class ClinicalNoteInline(admin.TabularInline):
    model = ClinicalNote
    extra = 0
    fields = ('documented_at', 'recorded_by_name', 'treatment_details')


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'age', 'phone_number', 'is_archived')
    search_fields = ('first_name', 'last_name', 'phone_number')
    list_filter = ('is_archived',)
    inlines = (AdmissionInline,)


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'patient',
        'admission_date',
        'discharge_date',
        'status',
        'next_of_kin_name',
    )
    list_filter = ('status', 'is_archived')
    search_fields = ('patient__first_name', 'patient__last_name', 'next_of_kin_name')
    inlines = (ClinicalNoteInline,)


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'admission',
        'documented_at',
        'recorded_by_name',
        'treatment_route',
    )
    list_filter = ('recorded_by_role', 'is_archived')
    search_fields = ('recorded_by_name', 'treatment_details', 'complaints')


@admin.register(ClinicalNoteVersion)
class ClinicalNoteVersionAdmin(admin.ModelAdmin):
    list_display = (
        'note',
        'version_number',
        'changed_by_name',
        'change_reason',
        'created_at',
    )
    list_filter = ('changed_by_role',)


@admin.register(ModuleAccess)
class ModuleAccessAdmin(admin.ModelAdmin):
    list_display = ('user', 'module_key')
    list_filter = ('module_key',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
