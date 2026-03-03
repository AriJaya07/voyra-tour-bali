# Enhanced Destination Form Documentation

## Overview

The enhanced DestinationForm now includes all data fields from the Prisma schema and supports comprehensive image upload functionality with AWS S3 integration. This form allows you to create and edit destinations with all their related data including images, contents, and locations.

## Features

### 1. Complete Destination Information
- **Title**: Required field for the destination name
- **Description**: Required detailed description of the destination
- **Price**: Required price in USD (supports decimal values)
- **Category**: Required dropdown selection from available categories
- **Slug**: Optional URL-friendly identifier

### 2. Multiple Image Upload with AWS S3
- **Upload Multiple Images**: Drag & drop or click to upload multiple images at once
- **AWS S3 Integration**: Images are automatically uploaded to AWS S3
- **Image Management**:
  - Set main image (featured image)
  - Add alt text for accessibility
  - Delete images
  - Real-time preview
- **Image Storage**: URLs are stored in the database, images are hosted on AWS S3

### 3. Content Management
- **Multiple Contents**: Add unlimited content sections
- **Content Fields**:
  - Title (required)
  - Subtitle (optional)
  - Description (required)
  - Date Available (required)
  - Availability Status (Yes/No)
- **Content Images**: Each content can have its own images
- **Dynamic Management**: Add/remove content sections as needed

### 4. Location Management
- **Multiple Locations**: Add unlimited location sections
- **Location Fields**:
  - Title (required)
  - Description (optional)
  - Link URL (optional)
- **Location Images**: Each location can have its own images
- **Dynamic Management**: Add/remove location sections as needed

## Data Flow

### Image Upload Process
1. User selects/ drags images
2. Images are temporarily displayed with preview URLs
3. Images are uploaded to AWS S3 via the image service
4. S3 returns URL and key
5. Image data is stored in the database with associations
6. Form displays uploaded images with full functionality

### Form Submission Process
1. Form validation checks required fields
2. Data is structured according to the schema
3. POST/PUT request is sent to the API
4. API creates/updates destination and related data
5. Images are associated with their respective entities
6. Complete destination data is returned

## API Endpoints

### POST /api/destinations
Creates a new destination with all related data:
- Destination basic information
- Image associations
- Content creation and image associations
- Location creation and image associations

### PUT /api/destinations/:id
Updates an existing destination:
- Updates destination basic information
- Updates existing images or creates new associations
- Updates existing contents or creates new ones
- Updates existing locations or creates new ones

### Image Upload
Uses the existing image upload system:
- POST /api/images for uploading images
- PATCH /api/images/:id for updating image associations

## Database Schema Integration

The form directly maps to the Prisma schema:

```prisma
model Destination {
  id          Int      @id @default(autoincrement())
  title       String
  slug        String? @unique
  description String
  price       Float?

  categoryId Int?
  category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  images Image[]

  packages Package[]
  contents Content[]
  locations Location[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Usage Examples

### Creating a New Destination
```typescript
const destinationData = {
  title: "Bali Beach Resort",
  description: "A beautiful beach resort in Bali",
  price: "299.99",
  categoryId: 1,
  slug: "bali-beach-resort",
  images: [
    {
      url: "https://s3.amazonaws.com/...",
      key: "bali-beach-1",
      altText: "Bali beach view",
      isMain: true,
      order: 0,
    }
  ],
  contents: [
    {
      title: "Beach Activities",
      subTitle: "Water Sports and Relaxation",
      description: "Enjoy various water sports",
      dateAvailable: "2024-01-01",
      isAvailable: true,
      images: []
    }
  ],
  locations: [
    {
      title: "Main Beach",
      description: "The main beach area",
      hrefLink: "https://maps.google.com/?q=bali",
      images: []
    }
  ]
};
```

### Editing an Existing Destination
The form supports editing existing destinations with all their current data pre-filled, allowing for:
- Updating basic information
- Adding/removing images
- Modifying content sections
- Modifying location sections
- All changes are properly tracked and saved

## Error Handling

The form includes comprehensive error handling:
- **Validation Errors**: Required field validation with user-friendly messages
- **Image Upload Errors**: Graceful handling of failed uploads
- **API Errors**: Proper error messages for server-side issues
- **Type Safety**: Full TypeScript support with proper type definitions

## Performance Considerations

- **Lazy Loading**: Images are loaded on demand
- **Optimistic Updates**: UI updates immediately, then syncs with server
- **Efficient Uploads**: Multiple images uploaded in parallel
- **Memory Management**: Temporary URLs are cleaned up after upload

## Integration with Existing System

The enhanced form integrates seamlessly with:
- **Existing Image Upload System**: Uses the same AWS S3 infrastructure
- **Category Management**: Leverages existing category selection
- **Dashboard Layout**: Maintains consistent UI/UX patterns
- **API Structure**: Follows existing API conventions

## Testing

A test component is available at `components/Dashboard/DestinationList/DestinationForm/TestForm.tsx` that demonstrates:
- Form functionality
- Data submission
- Console logging of submitted data
- Both create and edit modes

## Future Enhancements

Potential future improvements:
- Image cropping and resizing
- Bulk image operations
- Content and location reordering
- Advanced image metadata
- Integration with content management systems