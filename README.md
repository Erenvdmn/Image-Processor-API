# Image Processor API

This is a Node.js Express server for managing image uploads, watermarking, resizing, and retrieval. It uses MongoDB for storing image metadata and supports image processing via Sharp.

## Features

- Upload images and store metadata in MongoDB
- Upload watermark images
- Apply watermark and resize images
- Retrieve images and metadata by ID
- Delete images
- CORS enabled for cross-origin requests

## Folder Structure

- `index.js` - Main server file
- `modules/Image.js` - Mongoose schema for images
- `images/` - Uploaded and processed images
- `watermarks/` - Uploaded watermark images

## Setup

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Configure environment variables:**
   - Create a `.env` file with your MongoDB URI:
     ```
     MONGO_URI=your_mongodb_connection_string
     ```

3. **Run the server:**
   ```sh
   node index.js
   ```
   Or use nodemon for development:
   ```sh
   npx nodemon index.js
   ```

## API Endpoints

- `POST /upload`  
  Upload an image.  
  **Form field:** `file` (image), `tag` (string)

- `POST /uploadWM`  
  Upload a watermark image.  
  **Form field:** `file` (image)

- `POST /apply-watermark-and-edit`  
  Apply watermark and resize image.  
  **Body:** `{ id, width, height, type, tag }`

- `GET /media`  
  Get all image metadata.

- `GET /media/:id`  
  Get image metadata by ID.

- `GET /image/:id`  
  Get image file by ID.

- `POST /delete/:id`  
  Delete image by ID.

## Dependencies

- express
- mongoose
- cors
- dotenv
- multer
- sharp

## License

ISC
