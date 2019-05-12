// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

//Models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// Scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

//Port
var PORT = process.env.PORT || 3030

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

mongoose.connect("mongodb://localhost/news-scraper");


//ROUTES TO MAIN PAGE
app.get("/", function (req, res) {
    Article.find({ "saved": false }, function (error, data) {
        var hbsObject = {
            article: data
        };
        console.log(hbsObject);
        res.render("index", hbsObject);
    });
});

app.get("/saved", function (req, res) {
    Article.find({ "saved": true }).populate("notes").exec(function (error, articles) {
        var hbsObject = {
            article: articles
        };
        res.render("saved", hbsObject);
    });
});

//ROUTES TO SCRAPE
app.get("/scrape", function (req, res) {
    ////get html
    axios.get("https://www.nytimes.com/section/us").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
        $("div.story-body").each(function (i, element) {

            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(element)
                .children("h2.headline")
                .text();
            result.link = $(element)
                .find("a")
                .attr("href");
            result.summary = $(element)
                .find("p.summary")
                .text();

                Article.create(result) 
                    .then(function(data) {
                        console.log(data);
                    })
                    .catch(function(err) {
                        return res.json(err)
                    })
                })
   
        res.send("Scrape Complete");

    });
});


//ROUTE: CLEAR UNSAVED
app.get('/clear', function(req, res) {
    db.Article.remove({ saved: false}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            console.log('removed');
        }

    });
    res.redirect('/');
});

//Gets the JSON
app.get("/articles", function (req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function (error, data) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the data to the browser as a json object
        else {
            res.json(data);
        }
    });
});

//ROUTE FOR AN ARTICLE
app.get("/articles/:id", function (req, res) {

    Article.findOne({ "_id": req.params.id })
        //Populate note
        .populate("note")

        .exec(function (error, data) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            else {
                res.json(data);
            }
        });
});


//ROUTES TO SAVE
app.post("/articles/save/:id", function (req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
        // Execute the above query
        .exec(function (err, data) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            else {

                res.send(data);
            }
        });
});

//ROUTE TO DELETE
app.post("/articles/delete/:id", function (req, res) {
    //Anything not saved
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false, "notes": [] })

        .exec(function (err, data) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            else {
                res.send(data);
            }
        });
});


//ROUTE FOR COMMENT
app.post("/notes/save/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body)
    // And save the new note the db
    newNote.save(function (error, note) {

        if (error) {
            console.log(error);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": note } })
    
                .exec(function (err) {

                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        res.send(note);
                    }
                });
        }
    });
});

//ROUTE TO DELETE A NOTE
app.delete("/notes/delete/:note_id/:article_id", function (req, res) {
    // Use the note id to find and delete it
    Note.findOneAndRemove({ "_id": req.params.note_id }, function (err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.article_id }, { $pull: { "notes": req.params.note_id } })
                // Execute the above query
                .exec(function (err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        // Or send the note to the browser
                        res.send("Note Deleted");
                    }
                });
        }
    });
});

// Listen on port
app.listen(PORT, function () {
    console.log("App running on port " + PORT);
});