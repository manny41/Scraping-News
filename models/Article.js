const mongoose = require("mongoose");

//Create schema class
var Schema = mongoose.Schema;

//Create article schema
var ArticleSchema = new Schema({
    title:{
        type: String,
        require: true,
        unique: true
    },
    summary:{
        type: String,
        require: true
    },
    link:{
        type: String,
        required: true
    },
    saved: {
        type: Boolean,
        default: false
    },
    notes: [{
        type: Shema.Types.ObjectId,
        ref: "Note"
    }]
});

//Create Article model with the ArticleSchema
var Article = mongoose.model("Article", ArticleSchema);

//export model
module.exports = Article;