#!/usr/bin/env python3
"""
WordPress XML Parser - Extract Profile and Image Mappings
Parses WordPress export XML to create profile-to-image mapping CSV
"""

import xml.etree.ElementTree as ET
import csv
import re
from urllib.parse import urlparse

# Parse WordPress XML
print("📄 Parsing WordPress export XML...")
tree = ET.parse('/app/wordpress_export.xml')
root = tree.getroot()

# Define WordPress namespaces
namespaces = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/'
}

# Storage for extracted data
profiles = []
attachments = {}
posts = {}

print("\n🔍 Extracting items from XML...\n")

# First pass: Extract all items
for item in root.findall('.//item'):
    title = item.find('title')
    title_text = title.text if title is not None and title.text else ''
    
    # Get post type
    post_type = item.find('wp:post_type', namespaces)
    post_type_text = post_type.text if post_type is not None else ''
    
    # Get post ID
    post_id = item.find('wp:post_id', namespaces)
    post_id_text = post_id.text if post_id is not None else ''
    
    # Get post name (slug)
    post_name = item.find('wp:post_name', namespaces)
    post_name_text = post_name.text if post_name is not None else ''
    
    # Get content
    content = item.find('content:encoded', namespaces)
    content_text = content.text if content is not None and content.text else ''
    
    # Get excerpt
    excerpt = item.find('excerpt:encoded', namespaces)
    excerpt_text = excerpt.text if excerpt is not None and excerpt.text else ''
    
    # Extract custom fields
    custom_fields = {}
    for meta in item.findall('.//wp:postmeta', namespaces):
        meta_key = meta.find('wp:meta_key', namespaces)
        meta_value = meta.find('wp:meta_value', namespaces)
        if meta_key is not None and meta_value is not None:
            custom_fields[meta_key.text] = meta_value.text
    
    # Store based on post type
    if post_type_text == 'attachment':
        # This is an image/media file
        attachment_url = item.find('wp:attachment_url', namespaces)
        if attachment_url is not None and attachment_url.text:
            filename = attachment_url.text.split('/')[-1]
            attachments[post_id_text] = {
                'id': post_id_text,
                'title': title_text,
                'filename': filename,
                'url': attachment_url.text
            }
    
    elif post_type_text in ['post', 'page', 'portfolio']:
        # This is a profile or content post
        posts[post_id_text] = {
            'id': post_id_text,
            'title': title_text,
            'slug': post_name_text,
            'type': post_type_text,
            'content': content_text[:500] if content_text else '',  # First 500 chars
            'excerpt': excerpt_text,
            'custom_fields': custom_fields
        }

print(f"✅ Found {len(posts)} posts/profiles")
print(f"✅ Found {len(attachments)} attachments/images\n")

# Second pass: Match profiles to images
print("🔗 Matching profiles to images...\n")

profile_mappings = []

for post_id, post in posts.items():
    # Look for featured image
    featured_image_id = post['custom_fields'].get('_thumbnail_id', '')
    
    # Get profile data from custom fields
    profile_data = {
        'post_id': post_id,
        'title': post['title'],
        'slug': post['slug'],
        'type': post['type'],
        'featured_image_id': featured_image_id,
        'featured_image_url': '',
        'featured_image_filename': '',
        'additional_images': []
    }
    
    # Match featured image
    if featured_image_id and featured_image_id in attachments:
        att = attachments[featured_image_id]
        profile_data['featured_image_url'] = att['url']
        profile_data['featured_image_filename'] = att['filename']
    
    # Look for additional images in content
    if post['content']:
        # Find all image URLs in content
        img_pattern = r'(https?://[^\s<>"]+?\.(?:jpg|jpeg|png|gif|webp))'
        found_images = re.findall(img_pattern, post['content'], re.IGNORECASE)
        
        for img_url in found_images:
            filename = img_url.split('/')[-1]
            if filename not in profile_data['featured_image_filename']:
                profile_data['additional_images'].append({
                    'url': img_url,
                    'filename': filename
                })
    
    # Extract profile type from custom fields or title
    profile_type = 'general'
    if 'venue' in post['title'].lower() or 'business' in post['type']:
        profile_type = 'business'
    elif 'dj' in post['title'].lower() or 'artist' in post['title'].lower() or 'entrepreneur' in post['type']:
        profile_type = 'entrepreneur'
    
    profile_data['profile_type'] = profile_type
    
    # Add custom field data
    for key, value in post['custom_fields'].items():
        if not key.startswith('_'):  # Skip internal WordPress fields
            profile_data[key] = value
    
    profile_mappings.append(profile_data)
    
    # Print profile summary
    if profile_data['featured_image_filename']:
        print(f"✅ {post['title']}")
        print(f"   Type: {profile_type}")
        print(f"   Featured: {profile_data['featured_image_filename']}")
        if profile_data['additional_images']:
            print(f"   Additional: {len(profile_data['additional_images'])} images")
        print()

# Save to CSV
csv_filename = '/app/profile_image_mapping.csv'
print(f"\n💾 Saving to CSV: {csv_filename}")

with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
    # Define CSV fields
    fieldnames = [
        'post_id', 'title', 'slug', 'type', 'profile_type',
        'featured_image_filename', 'featured_image_url',
        'additional_images_count', 'additional_images'
    ]
    
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    
    for profile in profile_mappings:
        # Format additional images for CSV
        additional_imgs = '; '.join([img['filename'] for img in profile['additional_images']])
        
        writer.writerow({
            'post_id': profile['post_id'],
            'title': profile['title'],
            'slug': profile['slug'],
            'type': profile['type'],
            'profile_type': profile['profile_type'],
            'featured_image_filename': profile['featured_image_filename'],
            'featured_image_url': profile['featured_image_url'],
            'additional_images_count': len(profile['additional_images']),
            'additional_images': additional_imgs
        })

print(f"✅ CSV saved with {len(profile_mappings)} profiles")

# Create detailed JSON export as well
import json
json_filename = '/app/profile_image_mapping.json'
with open(json_filename, 'w', encoding='utf-8') as jsonfile:
    json.dump(profile_mappings, jsonfile, indent=2, ensure_ascii=False)

print(f"✅ JSON saved: {json_filename}")

# Print summary
print("\n" + "="*80)
print("📊 EXTRACTION SUMMARY")
print("="*80)
print(f"Total Profiles: {len(profile_mappings)}")

profile_types = {}
for p in profile_mappings:
    ptype = p['profile_type']
    profile_types[ptype] = profile_types.get(ptype, 0) + 1

print(f"\nBy Type:")
for ptype, count in profile_types.items():
    print(f"  - {ptype.title()}: {count}")

with_images = sum(1 for p in profile_mappings if p['featured_image_filename'])
print(f"\nProfiles with Images: {with_images}/{len(profile_mappings)}")

print("\n✅ Extraction complete!")
print(f"\n📄 Output Files:")
print(f"  - CSV: {csv_filename}")
print(f"  - JSON: {json_filename}")
