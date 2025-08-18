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
        type: [String],
        set: function(arr) {
            return [...new Set(arr)]
        }
    },
    type: {
        type: String
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
    },
    tag: {
        type: String
    }
});

export default mongoose.model('Image', imageSchema);