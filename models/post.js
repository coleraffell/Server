const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    post: {
        type: String,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("userPost", postSchema);
