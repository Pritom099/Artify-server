const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');
require('dotenv').config();

const port = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());

// Updated CORS configuration
const corsOptions = {
    origin: [
        "http://localhost:5174",
        "https://leafy-eclair-360741.netlify.app",
         // Add your frontend port here
    ],
    credentials: true,
};

app.use(cors(corsOptions));

// Firebase Admin Initialization
const serviceAccount = require('./servicekey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.q6wdesq.mongodb.net/artify?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Token Verification Middleware
const verifyToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).send({ message: "Unauthorized access: Token missing" });

    const token = authorization.split(" ")[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
    } catch (error) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
};

// Main Async Function
async function run() {
    try {
        await client.connect();

        const db = client.db('artify');
        const artCollection = db.collection('artworks');
        const favouriteCollection = db.collection('favourites');

        // Artworks Routes
        app.get('/artworks', async (req, res) => {
            const result = await artCollection.find().toArray();
            res.send(result);
        });

        app.get('/artworks/:id', async (req, res) => {
            const { id } = req.params;
            const result = await artCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.post('/artworks', async (req, res) => {
            const data = req.body;
            data.createdAt = new Date();
            const result = await artCollection.insertOne(data);
            res.send(result);
        });

        app.put('/artworks/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const data = req.body;
            const artwork = await artCollection.findOne({ _id: new ObjectId(id) });

            if (!artwork) return res.status(404).send({ message: "Artwork not found" });
            if (artwork.artistEmail !== req.decoded.email) return res.status(403).send({ message: "Forbidden access" });

            const result = await artCollection.updateOne({ _id: new ObjectId(id) }, { $set: data });
            res.send(result);
        });

        app.patch('/artworks/like/:id', async (req, res) => {
            const { id } = req.params;
            const result = await artCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { likes: 1 } }
            );
            res.send(result);
        });

        app.patch('/artworks/view/:id', async (req, res) => {
            const { id } = req.params;
            const result = await artCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { views: 1 } }
            );
            res.send(result);
        });

        app.delete('/artworks/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const artwork = await artCollection.findOne({ _id: new ObjectId(id) });

            if (!artwork) return res.status(404).send({ message: "Artwork not found" });
            if (artwork.artistEmail !== req.decoded.email) return res.status(403).send({ message: "Forbidden access" });

            const result = await artCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get("/latest-artworks", async (req, res) => {
            const result = await artCollection.find().sort({ createdAt: -1 }).limit(6).toArray();
            res.send(result);
        });

        app.get('/my-gallery', verifyToken, async (req, res) => {
            const email = req.query.email;
            const result = await artCollection.find({ artistEmail: email }).toArray();
            res.send(result);
        });

        // Favourites Routes
        app.post('/favourites', async (req, res) => {
            const data = req.body;
            const result = await favouriteCollection.insertOne(data);
            res.send(result);
        });

        app.get('/favourites', verifyToken, async (req, res) => {
            const email = req.query.email;
            const result = await favouriteCollection.find({ userEmail: email }).toArray();
            res.send(result);
        });

        app.delete('/favourites/:id', async (req, res) => {
            const { id } = req.params;
            const result = await favouriteCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // Search
        app.get('/search', async (req, res) => {
            const search_text = req.query.search || '';
            const result = await artCollection.find({ title: { $regex: search_text, $options: "i" } }).toArray();
            res.send(result);
        });

        // Test MongoDB connection
        await client.db("admin").command({ ping: 1 });
        console.log("✅ Connected to MongoDB successfully!");
    } catch (error) {
        console.error(error);
    }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
    res.send('Server is running fine!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;