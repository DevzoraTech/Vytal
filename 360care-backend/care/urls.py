from django.urls import path
from rest_framework import routers

from .views import (
    AdmissionViewSet,
    ClinicalNoteViewSet,
    CurrentUserView,
    LoginView,
    LogoutView,
    PatientViewSet,
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

urlpatterns = router.urls + [
    path('auth/login/', LoginView.as_view(), name='api-login'),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('auth/me/', CurrentUserView.as_view(), name='api-me'),
    path('lab/queue/', LabQueueView.as_view(), name='lab-queue'),
]
