from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("care", "0008_careplan_created_by_consultationevent_created_by_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="triageentry",
            name="recorded_by_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="triageentry",
            name="recorded_by_role",
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
