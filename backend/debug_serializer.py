import os
import sys
import django
import json

sys.path.append('c:\\DEVZORA TECHNOLOGIES\\vytal\\Vytal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from care.models import Patient
from care.serializers import PatientSerializer

def test_serializer():
    print("--- Testing Patient Serialization ---")
    try:
        patients = Patient.objects.filter(is_archived=False)[:5]
        serializer = PatientSerializer(patients, many=True)
        data = serializer.data
        print(f"Successfully serialized {len(data)} patients.")
        # print(json.dumps(data, default=str)) 
    except Exception as e:
        print("\n!!! ERROR SERIALIZING PATIENTS !!!")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_serializer()
