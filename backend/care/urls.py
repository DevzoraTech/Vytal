from django.urls import path
from rest_framework import routers

from .views import (
    AdmissionViewSet,
    ClinicalNoteViewSet,
    CarePlanViewSet,
    CurrentUserView,
    LoginView,
    LogoutView,
    PatientViewSet,
    ConsultationEventViewSet,
    ConsultationTaskViewSet,
    ConsultationWorklistView,
    LabOrderViewSet,
    LabQueueView,
    LabResultViewSet,
    TriageEntryViewSet,
)

router = routers.DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'admissions', AdmissionViewSet)
router.register(r'clinical-notes', ClinicalNoteViewSet)
router.register(r'triage', TriageEntryViewSet)
router.register(r'lab-results', LabResultViewSet)
router.register(r'consultation/lab-orders', LabOrderViewSet)
router.register(r'consultation/care-plans', CarePlanViewSet)
router.register(r'consultation/tasks', ConsultationTaskViewSet)
router.register(r'consultation/events', ConsultationEventViewSet)

urlpatterns = router.urls + [
    path('auth/login/', LoginView.as_view(), name='api-login'),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('auth/me/', CurrentUserView.as_view(), name='api-me'),
    path('lab/queue/', LabQueueView.as_view(), name='lab-queue'),
    path('consultation/worklist/', ConsultationWorklistView.as_view(), name='consultation-worklist'),
]
