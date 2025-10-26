# check_admins.py
import os
import re
import django
import sys

# Fix this path - adjust to your actual project location
sys.path.append('C:/Users/User1/ZeNO_PRoducts/zeno-speedy-services/server/zeno_backend')  # UPDATE THIS PATH
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zeno_backend.settings')
django.setup()

from django.contrib import admin

def check_admin_actions():
    admin_files = [
        'payments/admin.py',
        'vendors/admin.py', 
        'orders/admin.py',
        'services/admin.py',
        'users/admin.py'
    ]
    
    for admin_file in admin_files:
        if os.path.exists(admin_file):
            print(f"\n=== Checking {admin_file} ===")
            with open(admin_file, 'r') as f:
                content = f.read()
                
            # Look for class definitions
            class_pattern = r'class\s+(\w+)\(.*?ModelAdmin\):'
            classes = re.findall(class_pattern, content, re.DOTALL)
            
            for class_name in classes:
                print(f"Found admin class: {class_name}")
                
                # Look for actions defined as methods
                method_pattern = r'def\s+actions\s*\(self[^)]*\):'
                if re.search(method_pattern, content):
                    print(f"❌ PROBLEM: {class_name} has actions defined as a method!")
                    
                # Look for actions defined as list
                list_pattern = r'actions\s*=\s*\[[^\]]*\]'
                if re.search(list_pattern, content):
                    print(f"✅ {class_name} has actions defined as a list")

if __name__ == '__main__':
    check_admin_actions()