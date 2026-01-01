import os
import django
import sys
from datetime import datetime

# Setup Django environment
sys.path.append('c:\\DEVZORA TECHNOLOGIES\\vytal\\Vytal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from care.models import CarePlan, Patient
from django.utils import timezone

def check_care_plans():
    print(f"Server Timezone Now: {timezone.now()}")
    print(f"Server Date Now: {timezone.now().date()}")
    
    plans = CarePlan.objects.filter(is_archived=False).order_by('-created_at')[:5]
    for plan in plans:
        print(f"\nPlan ID: {plan.id}, Patient: {plan.admission.patient}")
        print(f"Created At: {plan.created_at}")
        items = plan.plan_items.get('treatment_schedule', [])
        print(f"Schedule Items ({len(items)}):")
        for item in items:
            print(f"  - Date: {item.get('date')} | Time: {item.get('time')} | Status: {item.get('status')}")
            
        # Logic simulation
        now_date = timezone.now().date().isoformat()
        print(f"  Comparing against now_date: {now_date}")
        
        future_items = []
        for item in items:
            s_date = item.get('date')
            status = item.get('status', 'pending')
            # Check logic
            is_future = s_date and s_date >= now_date
            is_not_done = status != 'completed' # Logic I plan to use
            print(f"    -> Item {s_date}: Future? {is_future} (s_date >= now), NotDone? {is_not_done} (status={status})")
            
            if is_future and is_not_done:
                future_items.append(item)
        
        print(f"  Found {len(future_items)} future pending items.")

if __name__ == "__main__":
    check_care_plans()
