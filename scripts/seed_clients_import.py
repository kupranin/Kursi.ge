#!/usr/bin/env python3
import csv
import json
import os
import sys
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional


CSV_PATH = Path("/Users/m3/Downloads/clients.csv")
BATCH_SIZE = 500
TABLE_NAME = "clients_import"


def parse_bool(value: Optional[str]):
  if value is None:
    return None
  normalized = value.strip().lower()
  if normalized == "true":
    return True
  if normalized == "false":
    return False
  return None


def normalize_row(row: Dict[str, str]):
  return {
    "source_created_at": row.get("Created At"),
    "source_updated_at": row.get("Updated At"),
    "user_identifier": row.get("User Identifier"),
    "user_identifier_encrypted": row.get("User Identifier (Encrypted)"),
    "active": parse_bool(row.get("Active")),
    "client_type": row.get("Type"),
    "name": row.get("Name"),
    "phone_number": row.get("Phone Number"),
    "phone_number_verified": parse_bool(row.get("Phone Number Verified")),
    "email": row.get(" Email") or row.get("Email"),
    "email_verified": parse_bool(row.get(" Email Verified") or row.get("Email Verified")),
    "marketing_preferences_agreement": parse_bool(row.get("Marketing Preferences Agreement")),
    "bank_account_details": row.get("Bank Account Details"),
  }


def post_batch(url: str, service_role_key: str, payload: List[Dict]):
  req = urllib.request.Request(
    f"{url}/rest/v1/{TABLE_NAME}?on_conflict=user_identifier",
    data=json.dumps(payload).encode("utf-8"),
    method="POST",
  )
  req.add_header("apikey", service_role_key)
  req.add_header("Authorization", f"Bearer {service_role_key}")
  req.add_header("Content-Type", "application/json")
  req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
  with urllib.request.urlopen(req) as resp:
    if resp.status < 200 or resp.status >= 300:
      raise RuntimeError(f"Supabase insert failed with status {resp.status}")


def count_rows(url: str, service_role_key: str) -> int:
  req = urllib.request.Request(
    f"{url}/rest/v1/{TABLE_NAME}?select=id",
    method="GET",
  )
  req.add_header("apikey", service_role_key)
  req.add_header("Authorization", f"Bearer {service_role_key}")
  req.add_header("Prefer", "count=exact")
  req.add_header("Range", "0-0")
  with urllib.request.urlopen(req) as resp:
    content_range = resp.headers.get("Content-Range", "")
    if "/" not in content_range:
      return -1
    return int(content_range.split("/")[-1])


def main():
  supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
  service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
  if not supabase_url or not service_role_key:
    print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
    sys.exit(1)

  if not CSV_PATH.exists():
    print(f"CSV not found: {CSV_PATH}", file=sys.stderr)
    sys.exit(1)

  total = 0
  batch: List[Dict] = []
  try:
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
      reader = csv.DictReader(f)
      for row in reader:
        normalized = normalize_row(row)
        if not normalized["user_identifier"]:
          continue
        batch.append(normalized)
        if len(batch) >= BATCH_SIZE:
          post_batch(supabase_url, service_role_key, batch)
          total += len(batch)
          print(f"Inserted/upserted {total} rows...")
          batch = []
      if batch:
        post_batch(supabase_url, service_role_key, batch)
        total += len(batch)
        print(f"Inserted/upserted {total} rows...")
  except urllib.error.HTTPError as exc:
    error_body = exc.read().decode("utf-8", errors="ignore")
    print(f"Supabase HTTP error: {exc.code} {error_body}", file=sys.stderr)
    sys.exit(1)

  final_count = count_rows(supabase_url, service_role_key)
  print(f"Done. Processed rows: {total}. Table row count: {final_count}.")


if __name__ == "__main__":
  main()
