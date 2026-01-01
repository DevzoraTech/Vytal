try:
    from care.models import Patient
    from care.serializers import PatientSerializer
    p = Patient.objects.filter(is_archived=False).first()
    if p:
        print(f"Testing patient: {p}")
        data = PatientSerializer(p).data
        print("Success:", data.get('next_treatment'))
    else:
        print("No patients found.")
except Exception:
    import traceback
    traceback.print_exc()
