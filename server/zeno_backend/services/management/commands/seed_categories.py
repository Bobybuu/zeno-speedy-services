# services/management/commands/seed_categories.py
from django.core.management.base import BaseCommand
from services.models import ServiceCategory

class Command(BaseCommand):
    help = 'Seed service categories'

    def handle(self, *args, **options):
        categories = [
            {'name': 'gas', 'description': 'Gas refill and delivery services', 'icon': 'gas-pump'},
            {'name': 'roadside_mechanical', 'description': 'Roadside mechanical assistance', 'icon': 'wrench'},
            {'name': 'roadside_fuel', 'description': 'Emergency fuel delivery', 'icon': 'fuel'},
            {'name': 'roadside_towing', 'description': 'Vehicle towing services', 'icon': 'truck'},
            {'name': 'oxygen', 'description': 'Medical oxygen refill services', 'icon': 'heart'},
            {'name': 'mechanic', 'description': 'General mechanic services', 'icon': 'settings'},
        ]
        
        for category_data in categories:
            category, created = ServiceCategory.objects.get_or_create(
                name=category_data['name'],
                defaults=category_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.get_name_display()}')
                )