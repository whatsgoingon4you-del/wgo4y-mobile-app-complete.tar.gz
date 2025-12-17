#!/usr/bin/env python3
"""
Migration: Add Approval System
Adds approval_status, approval_metadata to all content types
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def migrate():
    """Add approval system fields to all content"""
    
    print("🔄 Starting Approval System Migration...\n")
    
    # Content types that need approval
    content_collections = [
        'users',  # For profile photos and gallery images
        'events',
        'raffles',
        'coupons',
        'job_postings',
    ]
    
    total_updated = 0
    
    for collection_name in content_collections:
        collection = db[collection_name]
        
        # Count documents without approval_status
        count = await collection.count_documents({'approval_status': {'$exists': False}})
        
        if count > 0:
            print(f"📝 {collection_name}: {count} documents need migration")
            
            # Update all documents to add approval fields
            result = await collection.update_many(
                {'approval_status': {'$exists': False}},
                {
                    '$set': {
                        'approval_status': 'approved',  # Existing content is pre-approved
                        'approval_metadata': {
                            'approved_at': datetime.now(timezone.utc),
                            'approved_by': 'system',
                            'approval_note': 'Pre-existing content auto-approved during migration'
                        }
                    }
                }
            )
            
            print(f"   ✅ Updated {result.modified_count} documents")
            total_updated += result.modified_count
        else:
            print(f"✅ {collection_name}: Already migrated (0 pending)")
    
    print(f"\n🎉 Migration Complete! Updated {total_updated} total documents")
    print("\nApproval Status Values:")
    print("  - pending: Awaiting moderation (not publicly visible)")
    print("  - approved: Approved and publicly visible")
    print("  - rejected: Rejected by moderator (hidden)")

if __name__ == "__main__":
    asyncio.run(migrate())
