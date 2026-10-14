"""Bounded challenge/rate state; use a shared cache backend in production."""
import hashlib
from django.core.cache import cache


def normalize_email(value):
    return value.strip().lower() if isinstance(value, str) else ''


def cache_key(kind, value):
    return f'accounts:{kind}:{hashlib.sha256(value.encode()).hexdigest()}'


def limited(kind, value, limit, ttl):
    key = cache_key(kind, value)
    if cache.add(key, 1, ttl):
        return False
    try:
        return cache.incr(key) > limit
    except ValueError:
        return not cache.add(key, 1, ttl)
