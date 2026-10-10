from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'email', 'first_name', 'last_name', 'std_id', 'gender', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'std_id')
    ordering = ('id',)

admin.site.register(User, CustomUserAdmin)
