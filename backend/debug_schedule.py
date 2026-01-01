import os
import sys
import django
import json

sys.path.append('c:\\DEVZORA TECHNOLOGIES\\vytal\\Vytal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from care.models import CarePlan, Patient
from django.utils import timezone

def inspect_data():
    print("--- Inspecting Care Plans ---")
    plans = CarePlan.objects.filter(is_archived=False).order_by('-created_at')[:10]
    for plan in plans:
        print(f"\nPLAN ID: {plan.id} | Patient: {plan.admission.patient} | Created: {plan.created_at}")
        plan_items = plan.plan_items or {}
        print(f"Keys in plan_items: {list(plan_items.keys())}")
        
        if 'treatment_schedule' in plan_items:
            schedule = plan_items['treatment_schedule']
            if isinstance(schedule, list):
                print(f"Treatment Schedule has {len(schedule)} items.")
                for i, item in enumerate(schedule):
                    print(f"  Item {i}: {item}")
            else:
                print(f"WARNING: treatment_schedule is {type(schedule)}, expected list.")
        else:
            print("WARNING: 'treatment_schedule' key NOT found in plan_items.")

if __name__ == "__main__":
    inspect_data()
