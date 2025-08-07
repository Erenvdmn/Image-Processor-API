import mongoose from "mongoose";


const imageSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    path:  {
        type: String,
        unique: true,
    }, 
    extraTypes: {
        type: Object
    },
    type: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    width: {
        type: Number,
        required: true
    }, 
    height: {
        type: Number,
        required: true,
    }
});

export default mongoose.model('Image', imageSchema);