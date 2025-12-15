"""
Admin Entrepreneur Profile Editor Backend
Allows admins to edit entrepreneur profiles and manage R2 media
"""

# Add these endpoints to server.py

# 1. List R2 Media with Search
@api_router.get("/admin/r2-media")
async def list_r2_media(
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    user: Dict = Depends(get_current_user)
):
    """List R2 media objects with search and pagination (admin only)"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # R2 public bucket URL
    R2_BASE = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"
    
    # Since R2 is public, we'll return a curated list of known media
    # In a full implementation, you'd use boto3 to list bucket objects
    # For now, return known media from the bucket
    
    known_media = [
        # Dboy Stackalini
        {"url": f"{R2_BASE}/img8.jpg", "name": "img8.jpg", "type": "photo"},
        {"url": f"{R2_BASE}/dboy-stackalini-profile.jpg", "name": "dboy-stackalini-profile.jpg", "type": "photo"},
        {"url": f"{R2_BASE}/dboy-stackalini-1.jpg", "name": "dboy-stackalini-1.jpg", "type": "photo"},
        {"url": f"{R2_BASE}/dboy-stackalini-2.jpg", "name": "dboy-stackalini-2.jpg", "type": "photo"},
        
        # D.Petty
        {"url": f"{R2_BASE}/IMG_6465.jpg", "name": "IMG_6465.jpg", "type": "photo"},
        {"url": f"{R2_BASE}/d-petty-profile.jpg", "name": "d-petty-profile.jpg", "type": "photo"},
        {"url": f"{R2_BASE}/d-petty-1.jpg", "name": "d-petty-1.jpg", "type": "photo"},
        
        # Lace Nerd
        {"url": f"{R2_BASE}/The%20Lace%20Nerd%20profile%20image.jpeg", "name": "The Lace Nerd profile image.jpeg", "type": "photo"},
        {"url": f"{R2_BASE}/lace-mirror-profile.jpg", "name": "lace-mirror-profile.jpg", "type": "photo"},
        {"url": f"{R2_BASE}/lace-mirror-1.jpg", "name": "lace-mirror-1.jpg", "type": "photo"},
        
        # Venues (examples)
        {"url": f"{R2_BASE}/La-Mansion.png", "name": "La-Mansion.png", "type": "photo"},
        {"url": f"{R2_BASE}/McClellans.jpg", "name": "McClellans.jpg", "type": "photo"},
    ]
    
    # Apply search filter
    if search:
        filtered = [m for m in known_media if search.lower() in m['name'].lower()]
    else:
        filtered = known_media
    
    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated = filtered[start:end]
    
    return {
        'media': paginated,
        'total': len(filtered),
        'page': page,
        'per_page': per_page,
        'total_pages': (len(filtered) + per_page - 1) // per_page
    }


# 2. Update Entrepreneur Profile (Admin)
@api_router.put("/admin/entrepreneurs/{user_id}")
async def admin_update_entrepreneur(
    user_id: str,
    profile_data: dict,
    user: Dict = Depends(get_current_user)
):
    """Update entrepreneur profile as admin"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find user by id or _id
    entrepreneur = await db.users.find_one({'id': user_id})
    if not entrepreneur:
        entrepreneur = await db.users.find_one({'_id': user_id})
    
    if not entrepreneur or entrepreneur.get('user_type') != 'entrepreneur':
        raise HTTPException(status_code=404, detail="Entrepreneur not found")
    
    # Update allowed fields
    update_fields = {}
    
    if 'full_name' in profile_data:
        update_fields['full_name'] = profile_data['full_name']
    if 'service_name' in profile_data:
        update_fields['service_name'] = profile_data['service_name']
    if 'city' in profile_data:
        update_fields['city'] = profile_data['city']
    if 'state' in profile_data:
        update_fields['state'] = profile_data['state']
        update_fields['location'] = f"{profile_data['city']}, {profile_data['state']}"
    if 'bio' in profile_data:
        update_fields['bio'] = profile_data['bio']
    if 'occupations' in profile_data:
        update_fields['occupations'] = profile_data['occupations']
    
    # Media fields
    if 'profile_photo_url' in profile_data:
        update_fields['profile_photo'] = profile_data['profile_photo_url']
    if 'gallery_urls' in profile_data:
        update_fields['portfolio_photos'] = profile_data['gallery_urls']
    if 'flyer_urls' in profile_data:
        update_fields['flyer_urls'] = profile_data['flyer_urls']
    
    update_fields['updated_at'] = datetime.now(timezone.utc)
    
    # Update database
    await db.users.update_one(
        {'_id': entrepreneur['_id']},
        {'$set': update_fields}
    )
    
    print(f"✅ Admin updated entrepreneur: {profile_data.get('full_name', entrepreneur.get('full_name'))}")
    
    # Return updated profile
    updated = await db.users.find_one({'_id': entrepreneur['_id']})
    return {
        'id': updated.get('id') or updated.get('_id'),
        'full_name': updated.get('full_name'),
        'service_name': updated.get('service_name'),
        'city': updated.get('city'),
        'state': updated.get('state'),
        'bio': updated.get('bio'),
        'occupations': updated.get('occupations', []),
        'profile_photo': updated.get('profile_photo'),
        'gallery_urls': updated.get('portfolio_photos', []),
        'flyer_urls': updated.get('flyer_urls', [])
    }
