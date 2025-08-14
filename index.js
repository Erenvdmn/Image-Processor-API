import express from 'express';
import mongoose from 'mongoose';
import cors from "cors";
import dotenv from 'dotenv';
import sharp from 'sharp';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Image from './modules/Image.js';


dotenv.config();

const PORT = 5000;

const app = express();
app.use(cors());



mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error', error)
});

var storage = multer.diskStorage({
    destination: function (request, file, callback) {
        callback(null, './images');
    },
    filename: function (request, file, callback) {
        console.log("file: ", file);
        const extension = file.originalname.substring(file.originalname.lastIndexOf('.'));
        callback(null, Date.now() + extension);
    }
});

var upload = multer({ storage: storage}).single('file');

var storageWM = multer.diskStorage({
    destination: function (request, file, callback) {
        callback(null, './watermarks');
    },
    filename: function (request, file, callback) {
        console.log("file:", file);
        callback(null, 'watermark' + '.png');
    }
});

var uploadWM = multer({ storage: storageWM }).single('file');


// Uploading Images
app.post('/upload', (request, response) => {
    upload(request, response, async (error) => {
        if (error || !request.file) {
            console.error(error);
            return response.status(200).json({ message: "Error uploading file.", done: false });
        }

        try {
            const imagePath = request.file.path;

            const filename = request.file.filename;

            const metadata = await sharp(imagePath).metadata();

            const image = new Image({
                type: metadata.format,
                size: request.file.size,
                width: metadata.width,
                height: metadata.height,
                extraTypes: [],
                filename: filename
            });

            await image.save();

            const path = `http://192.168.0.250:${PORT}/image/${image._id}`;
            image.path = path;
            await image.save();

            console.log("Yeni Fotoğraf Kaydedildi", image);

            return response.status(200).json({ message: "Image uploaded successfully", image, done: true });
        } catch (error) {
            console.error("Error processing image", error);
            return response.status(200).json({ message: "Error processing image", done: false });
        }
    });
});

// Uploading Watermarks
app.post('/uploadWM', (request, response) => {
  uploadWM(request, response, async (error) => {
    if (error || !request.file) {
      console.error(error);
      return response.status(200).json({ message: "Error uploading watermark.", done: false });
    }
    try {
      return response.status(200).json({ message: "Watermark saved", done: true });
    } catch (err) {
      console.error("Error saving watermark", err);
      return response.status(200).json({ message: "Error saving watermark", done: false });
    }
  });
});

// Apply watermark and Edit the Image
app.post('/apply-watermark-and-edit', express.json(), async (request, response) => {
  const { id, width, height, type } = request.body;

  if (!id || !width || !height) {
    return response.status(200).json({ message: "fill all the entries", done: false });
  }

  const widthInt = parseInt(width);
  const heightInt = parseInt(height);

  try {
    const original = await Image.findById(id);
    if (!original) {
      return response.status(200).json({ message: "Image not found", done: false });
    }

    var oldPathType = original.filename.substring(original.filename.lastIndexOf(".")).substring(1);

    original.extraTypes.push(oldPathType);
    original.extraTypes.push(type);

    await original.save();

    const oldPath = path.resolve('images', original.filename);
    const watermarkPath = path.resolve('watermarks', 'watermark.png');

    const lastDot = original.filename.lastIndexOf('.');
    const baseName = lastDot > 0 ? original.filename.substring(0, lastDot) : original.filename;

    if (!fs.existsSync(watermarkPath)) {
        var newFileName = `resized-${baseName}.${type}`;
        var newPath = path.resolve('images', newFileName);

        await sharp(oldPath)
        .resize(widthInt, heightInt).toFormat(type)
        .toFile(newPath);
    } else {
        var newFileName = `watermarked-${baseName}.${original.type}`;
        var newPath = path.resolve('images', newFileName);

        await sharp(oldPath)
        .resize(widthInt, heightInt)
        .composite([{ input: watermarkPath, gravity: 'southeast' }]).toFormat(type)
        .toFile(newPath);
    }


    try { fs.unlinkSync(watermarkPath); } catch (_) {}

    const meta = await sharp(newPath).metadata();
    const stats = fs.statSync(newPath);


    const newImage = new Image({
      type: type,
      size: String(stats.size),
      width: meta.width,
      height: meta.height,
      extraTypes: [],
      filename: newFileName
    });

    await newImage.save();
    newImage.path = `http://192.168.0.250:${PORT}/image/${newImage._id}`;
    await newImage.save();

    return response.status(200).json({ message: "Watermark applied", image: newImage, done: true });
  } catch (error) {
    console.error("apply-watermark error:", error);
    return response.status(200).json({ message: "Error applying watermark", done: false });
  }
});

// Get All Images
app.get('/media', async(request, response) => {
    try {
        const images = await Image.find({});
        return response.status(200).json(images, { done: true });
    } catch (error) {
        return response.status(200).json("Error while getting images", { done: false });
    }
});

// Get Image data by id
app.get('/media/:id', async (request, response) => {
    const { id } = request.params;

    try {
        const image = await Image.findById(id);
        if (!image) {
            return response.status(200).json({ message: "Image not found", done: false})
        }

        return response.status(200).json(image, { done: true});
    } catch (error) {
        return response.status(200).json({ message: "Error while getting image", done: false});
    }
});

// Get Image by Id
app.get('/image/:id', async (request, response) => {
    const { id } = request.params;

    try {
        const image = await Image.findById(id);
        if (!image) {
            return response.status(200).json({ message: "Image not found", done: false});
        }

        const imagePath = path.join('images', image.filename);
        const absolutePath = path.resolve(imagePath);

        if (!fs.existsSync(absolutePath)) {
            return response.status(200).json({ message: "image file not found", done: false });
        }

        response.setHeader('Content-Type', `image/${image.type}`);
        fs.createReadStream(absolutePath).pipe(response);
    } catch (error) {
        console.error("Image render error", error);
        return response.status(200).json({ message: "Error rendering image", done: false});
    }
});

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`)
})