import express from 'express';
import mongoose, { mongo } from 'mongoose';
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

app.use(express.json());

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

// Converting Images Types
app.post('/convert-type', async (request, response) =>{
    const { id, newType } = request.body;

    try {
        const existingImage = await Image.findById(id);
        if (!existingImage) {
            return response.status(200).json({ message: "Image yok", done: false });
        }

        const oldFilename = existingImage.filename;
        const oldPath = path.resolve('images', oldFilename);
        const baseName = oldFilename.substring(0, oldFilename.lastIndexOf("."));
        const newFilename = `${baseName}.${newType}`;
        const newPath = path.resolve('images', newFilename);

        await sharp(oldPath).toFormat(newType).toFile(newPath);

        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }

        existingImage.type = newType;
        existingImage.filename = newFilename;
        await existingImage.save();

        return response.status(200).json({ message: "Image converted and updated successfully", done: true});
        
    } catch (error) {
        return response.status(200).json({ message: "Error while updating image", done: false});
    }

    
});

// Changing Image's Size
app.post('/change-size', async (request, response) => {
    const { id, width, height } = request.body;

    if (!id || !width || !height) {
        return response.status(200).json({ message: "fill all the entries", done: false });
    } 

    const widthInt = parseInt(width);
    const heightInt = parseInt(height);

    try {
        console.log("ID:", id);

        const image = await Image.findById(id);
        console.log("Image from DB:", image);

        if (!image) {
            return response.status(200).json({ message: "Image not found", done: false });
        }

        const fileName = image.filename;
        const oldPath = path.resolve('images', fileName);
        const tempPath = path.resolve('images', 'temp_' + fileName);

        await sharp(oldPath)
        .resize(widthInt, heightInt)
        .toFile(tempPath);

        fs.unlinkSync(oldPath);

        fs.renameSync(tempPath, oldPath);


        image.width = width;
        image.height = height;
        await image.save();

        return response.status(200).json({ message: "Image resized successfully", done: true });
    } catch (error) {
        console.error("Error:", error);
        return response.status(200).json({ message: "Error while changing image size", done: false });
    }
});


app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`)
})