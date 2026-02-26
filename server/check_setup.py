from utils.supabase_client import supabase

def check_setup():
    print("Checking Supabase Connection...")
    
    # 1. Check Table
    try:
        print("1. Checking 'violations' table...")
        supabase.table("violations").select("id").limit(1).execute()
        print("   [PASS] Table 'violations' exists and is accessible.")
    except Exception as e:
        print(f"   [FAIL] Could not access 'violations' table. Error: {e}")

    # 2. Check Bucket
    try:
        print("2. Checking 'violation-evidence' bucket...")
        buckets = supabase.storage.list_buckets()
        found = False
        for b in buckets:
            if b.name == "violation-evidence":
                found = True
                break
        
        if found:
            print("   [PASS] Bucket 'violation-evidence' exists.")
        else:
            print("   [FAIL] Bucket 'violation-evidence' NOT found.")
            print("          Existing buckets:", [b.name for b in buckets])
            
    except Exception as e:
        print(f"   [FAIL] Could not list buckets. Error: {e}")

if __name__ == "__main__":
    check_setup()
