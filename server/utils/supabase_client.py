from supabase import create_client, ClientOptions
from core.config import settings

_supabase_client = None

def get_supabase():
    """
    Lazy initialization of Supabase client to avoid blocking during module import.
    """
    global _supabase_client
    if _supabase_client is None:
        options = ClientOptions(
            postgrest_client_timeout=60,
            storage_client_timeout=60,
            schema="public",
        )
        # Use service role key to bypass RLS for server-side operations
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        _supabase_client = create_client(settings.SUPABASE_URL, key, options=options)
    return _supabase_client

# For backward compatibility, provide a supabase object that acts like the client
class LazySupabaseClient:
    def __getattr__(self, name):
        return getattr(get_supabase(), name)

supabase = LazySupabaseClient()
